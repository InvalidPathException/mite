import binaryen from "binaryen";
import {
    bigintToLowAndHigh,
    createMiteType,
    lookForVariable,
    miteSignatureToBinaryenSignature,
    updateExpected,
    STACK_POINTER,
    getBinaryOperator,
    constant,
    rvalue,
    newBlock,
    parseType,
    createVariable,
    callFunction,
    allocate,
    ARENA_HEAP_OFFSET,
    ARENA_HEAP_POINTER,
    JS_HEAP_POINTER
} from "./utils.js";
import {
    Context,
    ExpressionInformation,
    IntrinsicHandlers,
    ProgramToModuleOptions,
    TypeInformation,
    intrinsic_names
} from "../types/code_gen.js";
import type {
    Program,
    Statement,
    Expression,
    BinaryExpression,
    VariableDeclaration,
    FunctionDeclaration,
    ReturnStatement,
    Literal,
    AssignmentExpression,
    Identifier,
    CallExpression,
    IfExpression,
    ForExpression,
    BlockExpression,
    DoWhileExpression,
    WhileExpression,
    ContinueExpression,
    BreakExpression,
    LogicalExpression,
    EmptyExpression,
    MemberExpression,
    Declaration,
    ArrayExpression,
    IndexExpression,
    ObjectExpression
} from "../types/nodes.js";
import { BinaryOperator, TokenType } from "../types/tokens.js";
import { AllocationLocation, LinearMemoryLocation, MiteType, Primitive } from "./type_classes.js";
import {
    createIntrinsics,
    identifyStructs,
    createTypeOperations,
    createConversions
} from "./context_initialization.js";
import { addBuiltins } from "./builtin_functions.js";

export function programToModule(
    program: Program,
    { stack_size = 64 * 1024 }: ProgramToModuleOptions = {}
): binaryen.Module {
    const structs = Object.fromEntries(identifyStructs(program).map((x) => [x.name, x]));
    const primitives = Object.fromEntries(Primitive.primitives.entries());

    const mod = new binaryen.Module();
    const ctx: Context = {
        mod,
        variables: new Map(),
        functions: new Map(),
        operators: createTypeOperations(mod),
        intrinsics: createIntrinsics(mod),
        conversions: createConversions(mod),
        stacks: { continue: [], break: [], depth: 0 },
        types: { ...primitives, ...structs },
        current_block: [],
        local_count: 0,
        // @ts-expect-error initially we're not in a function
        current_function: null
    };
    addBuiltins(ctx);

    const js_heap_size = 65536;

    ctx.mod.setMemory(256, 256, "memory", [], false, false, "main_memory");
    ctx.mod.addGlobal(STACK_POINTER, binaryen.i32, true, ctx.mod.i32.const(stack_size));
    ctx.mod.addGlobal(JS_HEAP_POINTER, binaryen.i32, false, ctx.mod.i32.const(stack_size + 4));
    ctx.mod.addGlobal(ARENA_HEAP_OFFSET, binaryen.i32, true, ctx.mod.i32.const(0));
    ctx.mod.addGlobal(
        ARENA_HEAP_POINTER,
        binaryen.i32,
        false,
        ctx.mod.i32.const(stack_size + 4 + js_heap_size)
    );

    ctx.functions = new Map(
        program.body
            .map((x) => (x.type === "ExportNamedDeclaration" ? x.declaration : x))
            .filter((x): x is FunctionDeclaration => x.type === "FunctionDeclaration")
            .map(({ id, params, returnType }) => [
                id.name,
                {
                    params: params.map(({ typeAnnotation }) => parseType(ctx, typeAnnotation)),
                    results: parseType(ctx, returnType)
                }
            ])
    );

    for (const type of ["i32", "i64", "f32", "f64"]) {
        ctx.functions.set(`log_${type}`, {
            params: [ctx.types[type]],
            results: ctx.types.void
        });
    }

    for (const node of program.body) {
        switch (node.type) {
            case "ExportNamedDeclaration":
            case "FunctionDeclaration":
            case "StructDeclaration":
                handleDeclaration(ctx, node);
                break;
            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    return ctx.mod;
}

function handleDeclaration(ctx: Context, node: Declaration): void {
    switch (node.type) {
        case "ExportNamedDeclaration":
            handleDeclaration(ctx, node.declaration);
            const { declaration } = node;
            if (declaration.type === "FunctionDeclaration") {
                ctx.mod.addFunctionExport(declaration.id.name, declaration.id.name);
            } else if (declaration.type === "VariableDeclaration") {
                for (const { id } of declaration.declarations) {
                    ctx.mod.addGlobalExport(id.name, id.name);
                }
            } else if (declaration.type === "StructDeclaration") {
                // struct exports don't carry any runtime weight
            } else {
                throw new Error(`Unknown export type: ${declaration.type}`);
            }
            break;
        case "FunctionDeclaration":
            buildFunctionDeclaration(ctx, node);
            break;
        case "StructDeclaration":
            // struct declarations don't carry any runtime weight
            break;
    }
}

function buildFunctionDeclaration(ctx: Context, node: FunctionDeclaration): void {
    const has_output_parameter = parseType(ctx, node.returnType).classification !== "primitive";

    let local_count = 0;
    ctx.variables = new Map();
    if (has_output_parameter) {
        ctx.variables.set(
            "Return Value",
            createMiteType(
                ctx,
                parseType(ctx, node.returnType),
                // output parameter variable #
                local_count++
            )
        );
    }
    const params = new Map(
        node.params.map(({ name, typeAnnotation }) => [
            name.name,
            createMiteType(ctx, parseType(ctx, typeAnnotation), local_count++)
        ])
    );
    Array.from(params.entries()).forEach(([key, val]) => ctx.variables.set(key, val));

    ctx.variables.set(
        "Local Stack Pointer", // put spaces in so it doesn't conflict with user-defined variables
        new Primitive(ctx, ctx.types.i32, AllocationLocation.Local, local_count++)
    );

    const current_function = {
        ...ctx.functions.get(node.id.name)!,
        stack_frame_size: 0,
        local_count
    };

    const function_body = newBlock(ctx, () => {
        node.body.body.forEach((statement) =>
            statementToExpression({ ...ctx, current_function }, statement)
        );
    });

    const function_variables = Array.from(ctx.variables.entries())
        .filter(([name]) => !params.has(name))
        .map(([, { type }]) => type);

    miteSignatureToBinaryenSignature(
        { ...ctx, current_function },
        node.id.name,
        function_variables,
        function_body.ref
    );
}

function statementToExpression(ctx: Context, value: Statement): void {
    switch (value.type) {
        case "VariableDeclaration":
            return variableDeclarationToExpression(ctx, value);
        case "ReturnStatement":
            return returnStatementToExpression(ctx, value);
        case "ExpressionStatement":
            ctx.current_block.push(expressionToExpression(ctx, value.expression));
            return;
    }

    throw new Error(`Unknown statement type: ${value.type}`);
}

function variableDeclarationToExpression(ctx: Context, value: VariableDeclaration): void {
    for (const { id, typeAnnotation, init } of value.declarations) {
        let expr: ExpressionInformation | undefined = undefined;
        let type: TypeInformation;
        if (typeAnnotation && init) {
            expr = expressionToExpression(
                updateExpected(ctx, parseType(ctx, typeAnnotation)),
                init
            );
            type = expr.type;
        } else if (typeAnnotation) {
            type = parseType(ctx, typeAnnotation);
        } else if (init) {
            expr = expressionToExpression(ctx, init);
            type = expr.type;
        } else {
            throw new Error("Variable declaration must have type or initializer");
        }

        const variable = createVariable(
            ctx,
            type,
            typeAnnotation?.location ?? LinearMemoryLocation.Stack,
            expr
        );

        ctx.variables.set(id.name, variable);
    }
}

function returnStatementToExpression(ctx: Context, value: ReturnStatement): void {
    const expr =
        value.argument &&
        expressionToExpression(updateExpected(ctx, ctx.current_function.results), value.argument);

    ctx.current_block.push({
        ref: ctx.mod.global.set(
            STACK_POINTER,
            ctx.mod.i32.add(
                ctx.mod.global.get(STACK_POINTER, binaryen.i32),
                // this won't work with early returns
                ctx.mod.i32.const(ctx.current_function.stack_frame_size)
            )
        ),
        expression: binaryen.ExpressionIds.GlobalSet,
        type: ctx.types.void
    });

    if (ctx.current_function.results.classification === "primitive") {
        ctx.current_block.push({
            ref: ctx.mod.return(expr?.ref),
            type: ctx.types.void,
            expression: binaryen.ExpressionIds.Return
        });
    } else {
        ctx.current_block.push(ctx.variables.get("Return Value")!.set(expr!));
        ctx.current_block.push({
            ref: ctx.mod.return(),
            type: ctx.types.void,
            expression: binaryen.ExpressionIds.Return
        });
    }
}

function expressionToExpression(ctx: Context, value: Expression): ExpressionInformation {
    if (value.type === "Literal") {
        return literalToExpression(ctx, value);
    } else if (value.type === "Identifier") {
        return identifierToExpression(ctx, value);
    } else if (value.type === "BinaryExpression") {
        return binaryExpressionToExpression(ctx, value);
    } else if (value.type === "LogicalExpression") {
        return logicalExpressionToExpression(ctx, value);
    } else if (value.type === "AssignmentExpression") {
        return assignmentExpressionToExpression(ctx, value);
    } else if (value.type === "CallExpression") {
        return callExpressionToExpression(ctx, value);
    } else if (value.type === "IfExpression") {
        return ifExpressionToExpression(ctx, value);
    } else if (value.type === "ForExpression") {
        return forExpressionToExpression(ctx, value);
    } else if (value.type === "BlockExpression") {
        return blockExpressionToExpression(ctx, value);
    } else if (value.type === "DoWhileExpression") {
        return doWhileExpressionToExpression(ctx, value);
    } else if (value.type === "WhileExpression") {
        return whileExpressionToExpression(ctx, value);
    } else if (value.type === "EmptyExpression") {
        return emptyExpressionToExpression(ctx, value);
    } else if (value.type === "ContinueExpression") {
        return continueExpressionToExpression(ctx, value);
    } else if (value.type === "BreakExpression") {
        return breakExpressionToExpression(ctx, value);
    } else if (value.type === "MemberExpression") {
        return memberExpressionToExpression(ctx, value);
    } else if (value.type === "ArrayExpression") {
        return arrayExpressionToExpression(ctx, value);
    } else if (value.type === "IndexExpression") {
        return indexExpressionToExpression(ctx, value);
    } else if (value.type === "ObjectExpression") {
        return objectExpressionToExpression(ctx, value);
    } else {
        switch (value.type) {
            case "AwaitExpression":
            case "ChainExpression":
            case "FunctionExpression":
            case "ImportExpression":
            case "MetaProperty":
            case "SequenceExpression":
            case "TaggedTemplateExpression":
            case "TemplateLiteral":
            case "ThisExpression":
            case "UnaryExpression":
            case "UpdateExpression":
            case "YieldExpression":
                throw new Error(`Currently unsupported statement type: ${value.type}`);
            default:
                // @ts-expect-error value should be `never` here
                throw new Error(`Unknown statement type: ${value.type}`);
        }
    }
}

function literalToExpression(ctx: Context, value: Literal): ExpressionInformation {
    if (ctx.expected?.classification && ctx.expected.classification !== "primitive")
        throw new Error(`Expected primitive type, got ${ctx.expected?.classification}`);

    const type = ctx.expected ?? ctx.types[value.literalType];
    let ref;
    switch (type.name) {
        case "i32":
        case "u32":
            if (typeof value.value === "object") throw new Error("Expected numerical literal");
            ref = ctx.mod.i32.const(Number(value.value));
            break;
        case "i64":
        case "u64":
            if (typeof value.value === "object") throw new Error("Expected numerical literal");
            ref = ctx.mod.i64.const(...bigintToLowAndHigh(value.value));
            break;
        case "f32":
            if (typeof value.value === "object") throw new Error("Expected numerical literal");
            ref = ctx.mod.f32.const(Number(value.value));
            break;
        case "f64":
            if (typeof value.value === "object") throw new Error("Expected numerical literal");
            ref = ctx.mod.f64.const(Number(value.value));
            break;
        case "f32x4":
        case "f64x2":
        case "i64x2":
        case "u64x2":
        case "i32x4":
        case "u32x4":
        case "i16x8":
        case "u16x8":
        case "i8x16":
        case "u8x16":
            if (typeof value.value !== "object") throw new Error("Expected SIMD literal");
            ref = ctx.mod.v128.const(value.value);
            break;
        default:
            throw new Error(`Unknown literal type: ${type}`);
    }
    return {
        ref,
        type,
        expression: binaryen.ExpressionIds.Const
    };
}

function identifierToExpression(ctx: Context, { name }: Identifier): ExpressionInformation {
    const value = lookForVariable(ctx, name);
    return value.get();
}

function binaryExpressionToExpression(
    ctx: Context,
    value: BinaryExpression
): ExpressionInformation {
    const left = expressionToExpression(ctx, value.left);
    const right = expressionToExpression(ctx, value.right);

    const operator = getBinaryOperator(ctx, left.type, value.operator);
    return operator(left, right);
}

function logicalExpressionToExpression(
    ctx: Context,
    value: LogicalExpression
): ExpressionInformation {
    const left = expressionToExpression(updateExpected(ctx, ctx.types.i32), value.left),
        right = expressionToExpression(updateExpected(ctx, ctx.types.i32), value.right);

    switch (value.operator) {
        case TokenType.LOGICAL_OR:
            return {
                ref: ctx.mod.if(
                    left.ref,
                    ctx.mod.i32.const(1),
                    ctx.mod.i32.ne(right.ref, ctx.mod.i32.const(0))
                ),
                expression: binaryen.ExpressionIds.If,
                type: ctx.types.i32
            };
        case TokenType.LOGICAL_AND:
            return {
                ref: ctx.mod.if(
                    ctx.mod.i32.eqz(left.ref),
                    ctx.mod.i32.const(0),
                    ctx.mod.i32.ne(right.ref, ctx.mod.i32.const(0))
                ),
                expression: binaryen.ExpressionIds.If,
                type: ctx.types.i32
            };
    }

    throw new Error(`Unknown logical operator: ${value.operator}`);
}

function assignmentExpressionToExpression(
    ctx: Context,
    value: AssignmentExpression
): ExpressionInformation {
    const variable = unwrapVariable(ctx, value.left);

    const expr = expressionToExpression(updateExpected(ctx, variable.type), value.right);
    if (value.operator === "=") return variable.set(expr);
    if (variable.type.classification !== "primitive")
        throw new Error("Cannot use operator assignment on non-primitive type");

    const operation = value.operator.slice(0, -1) as BinaryOperator;
    const operator = getBinaryOperator(ctx, variable.type, operation);

    return variable.set(operator(variable.get(), expr));
}

function callExpressionToExpression(ctx: Context, value: CallExpression): ExpressionInformation {
    const function_name = value.callee.name;
    const fn = ctx.functions.get(function_name);
    const args = value.arguments.map((arg, i) =>
        expressionToExpression(updateExpected(ctx, fn?.params[i]), arg)
    );

    const primary_argument = args[0]?.type.name;
    if (intrinsic_names.has(function_name)) {
        if (!primary_argument) throw new Error("Intrinsic must have primary argument");
        const intrinsic =
            ctx.intrinsics[primary_argument][function_name as keyof IntrinsicHandlers];
        if (!intrinsic)
            throw new Error(`Intrinsic ${function_name} not defined for ${primary_argument}`);
        // @ts-expect-error this is fine
        return intrinsic(...args);
    } else if (ctx.conversions[primary_argument]?.[function_name]) {
        return ctx.conversions[primary_argument][function_name](args[0]);
    } else if (!fn) throw new Error(`Unknown function: ${function_name}`);

    return callFunction(
        ctx,
        function_name,
        fn,
        args[0]?.expression === binaryen.ExpressionIds.Nop ? [] : args
    );
}

function ifExpressionToExpression(ctx: Context, value: IfExpression): ExpressionInformation {
    const condition = expressionToExpression(updateExpected(ctx, ctx.types.i32), value.test);
    const true_branch = expressionToExpression(ctx, value.consequent);
    const false_branch = value.alternate && expressionToExpression(ctx, value.alternate);

    return {
        ref: ctx.mod.if(condition.ref, true_branch.ref, false_branch?.ref),
        type: true_branch.type,
        expression: binaryen.ExpressionIds.If
    };
}

function forExpressionToExpression(ctx: Context, value: ForExpression): ExpressionInformation {
    const for_loop_container_label = `ForLoopOuterContainerBlock$${ctx.stacks.depth}`;
    const for_loop_loop_part_label = `ForLoopBodyTestUpdateLoop$${ctx.stacks.depth}`;
    const for_loop_user_body_label = `ForLoopUserDefinedBody$${ctx.stacks.depth}`;

    // breaks break out of the whole loop
    ctx.stacks.break.push(for_loop_container_label);

    // this is not a mistake; continues need to break out of the main body and re-execute
    // update and test, and main_body only contains the user-defined body
    ctx.stacks.continue.push(for_loop_user_body_label);
    ctx.stacks.depth++;

    const init =
        value.init &&
        newBlock(ctx, () =>
            value.init!.type === "VariableDeclaration"
                ? variableDeclarationToExpression(ctx, value.init)
                : expressionToExpression(ctx, value.init!)
        );

    const test =
        value.test &&
        (value.test.type === "EmptyExpression"
            ? ctx.mod.i32.const(1)
            : newBlock(
                  ctx,
                  () => expressionToExpression(updateExpected(ctx, ctx.types.i32), value.test!),
                  { type: binaryen.i32 }
              ).ref);

    const update = value.update && newBlock(ctx, () => expressionToExpression(ctx, value.update!));
    const body = newBlock(ctx, () => expressionToExpression(ctx, value.body), {
        name: for_loop_user_body_label
    });

    const for_loop_container = [];
    if (init) for_loop_container.push(init.ref);
    if (test) {
        // if test fails, don't even start the loop
        for_loop_container.push(
            ctx.mod.br_if(for_loop_container_label, ctx.mod.i32.eqz(ctx.mod.copyExpression(test)))
        );
    }

    const for_loop_loop_part = [];

    for_loop_loop_part.push(body.ref);
    if (update) for_loop_loop_part.push(update.ref);
    if (test) for_loop_loop_part.push(ctx.mod.br_if(for_loop_loop_part_label, test));

    for_loop_container.push(
        ctx.mod.loop(for_loop_loop_part_label, ctx.mod.block(null, for_loop_loop_part))
    );

    const ref = ctx.mod.block(for_loop_container_label, for_loop_container);

    ctx.stacks.break.pop();
    ctx.stacks.continue.pop();

    return {
        ref,
        type: ctx.types.void,
        expression: binaryen.ExpressionIds.Block
    };
}

function doWhileExpressionToExpression(
    ctx: Context,
    value: DoWhileExpression
): ExpressionInformation {
    const do_while_loop_container_block = `DoWhileLoopContainerBlock$${ctx.stacks.depth}`;
    const do_while_loop_body_block = `DoWhileLoopBody$${ctx.stacks.depth}`;
    ctx.stacks.break.push(do_while_loop_container_block);
    ctx.stacks.continue.push(do_while_loop_body_block);
    ctx.stacks.depth++;

    const body = newBlock(ctx, () => expressionToExpression(ctx, value.body));
    const test = value.test
        ? newBlock(
              ctx,
              () => expressionToExpression(updateExpected(ctx, ctx.types.i32), value.test),
              { type: binaryen.i32 }
          )
        : constant(ctx, 0);

    const ref = ctx.mod.loop(
        do_while_loop_body_block,
        ctx.mod.block(do_while_loop_container_block, [
            body.ref,
            ctx.mod.br_if(do_while_loop_body_block, test.ref)
        ])
    );

    ctx.stacks.break.pop();
    ctx.stacks.continue.pop();

    return {
        ref,
        type: ctx.types.void,
        expression: binaryen.ExpressionIds.Loop
    };
}

function whileExpressionToExpression(ctx: Context, value: WhileExpression): ExpressionInformation {
    const while_loop_container_block = `WhileLoopContainerBlock$${ctx.stacks.depth}`;
    const while_loop_body_block = `WhileLoopBody$${ctx.stacks.depth}`;
    ctx.stacks.break.push(while_loop_container_block);
    ctx.stacks.continue.push(while_loop_body_block);
    ctx.stacks.depth++;

    const test = newBlock(
        ctx,
        () => expressionToExpression(updateExpected(ctx, ctx.types.i32), value.test),
        { type: binaryen.i32 }
    );
    const body = newBlock(ctx, () => expressionToExpression(ctx, value.body));

    const ref = ctx.mod.if(
        test.ref, // if test.ref tries to continue or break it might be weird
        ctx.mod.block(while_loop_container_block, [
            ctx.mod.loop(
                while_loop_body_block,
                ctx.mod.block(null, [
                    body.ref,
                    ctx.mod.br_if(while_loop_body_block, ctx.mod.copyExpression(test.ref))
                ])
            )
        ])
    );

    ctx.stacks.break.pop();
    ctx.stacks.continue.pop();

    return {
        ref,
        type: ctx.types.void,
        expression: binaryen.ExpressionIds.If
    };
}

function blockExpressionToExpression(ctx: Context, value: BlockExpression): ExpressionInformation {
    // note: currently can't break out of blocks
    const name = `Block$${ctx.stacks.depth}`;
    ctx.stacks.depth++;

    return newBlock(
        ctx,
        () => value.body.forEach((statement) => statementToExpression(ctx, statement)),
        { name, type: binaryen.auto }
    );
}

function continueExpressionToExpression(
    ctx: Context,
    value: ContinueExpression
): ExpressionInformation {
    const loop = ctx.stacks.continue.at(-1);
    if (!loop) throw new Error("Cannot continue outside of loop");
    return {
        ref: ctx.mod.br(loop),
        type: ctx.types.void,
        expression: binaryen.ExpressionIds.Break
    };
}

// todo: support labeled breaks;
function breakExpressionToExpression(ctx: Context, value: BreakExpression): ExpressionInformation {
    const block = ctx.stacks.break.at(-1);
    if (!block) throw new Error("Cannot break outside of a block");
    return {
        ref: ctx.mod.br(block),
        type: ctx.types.void,
        expression: binaryen.ExpressionIds.Break
    };
}

function emptyExpressionToExpression(ctx: Context, value: EmptyExpression): ExpressionInformation {
    return {
        ref: ctx.mod.nop(),
        type: ctx.types.void,
        expression: binaryen.ExpressionIds.Nop
    };
}

function memberExpressionToExpression(
    ctx: Context,
    value: MemberExpression
): ExpressionInformation {
    const struct = expressionToExpression(ctx, value.object);
    if (struct.type.classification !== "struct")
        throw new Error("Cannot access member of non-struct");
    return rvalue(ctx, struct).access(value.property.name).get();
}

function arrayExpressionToExpression(ctx: Context, value: ArrayExpression): ExpressionInformation {
    if (value.elements.length === 0) {
        throw new Error("Cannot create empty array");
    } else if (ctx.expected && ctx.expected.classification !== "array") {
        throw new Error(`Expected array type, got ${ctx.expected.classification}`);
    }

    const first_element = expressionToExpression(updateExpected(ctx, undefined), value.elements[0]);
    const element_type = first_element.type;
    const sizeof = element_type.sizeof * value.elements.length;

    const location = value.location ?? ctx.expected?.location ?? LinearMemoryLocation.Stack;

    const array = createMiteType(
        ctx,
        {
            classification: "array",
            name: `[${element_type.name}; ${value.elements.length}]`,
            sizeof,
            element_type,
            length: value.elements.length
        },
        allocate(ctx, sizeof, location)
    );

    for (let i = 0; i < value.elements.length; i++) {
        const expr = expressionToExpression(updateExpected(ctx, element_type), value.elements[i]);
        ctx.current_block.push(array.index(constant(ctx, i)).set(expr));
    }

    return array.get();
}

function indexExpressionToExpression(ctx: Context, value: IndexExpression): ExpressionInformation {
    const array = expressionToExpression(ctx, value.object);
    if (array.type.classification !== "array") {
        throw new Error(`Cannot index non-array type ${array.type.name}`);
    }
    const index = expressionToExpression(updateExpected(ctx, ctx.types.i32), value.index);

    return rvalue(ctx, array).index(index).get();
}

function objectExpressionToExpression(
    ctx: Context,
    value: ObjectExpression
): ExpressionInformation {
    const type = parseType(ctx, value.typeAnnotation);
    if (type.classification !== "struct") throw new Error("Cannot create non-struct object");

    const location =
        value.typeAnnotation.location ?? ctx.expected?.location ?? LinearMemoryLocation.Stack;

    const struct = createMiteType(ctx, type, allocate(ctx, type.sizeof, location));

    const fields = new Map(type.fields);
    for (const property of value.properties) {
        const field = fields.get(property.key.name);
        if (!field) throw new Error(`Struct ${type.name} has no field ${property.key.name}`);
        fields.delete(property.key.name);

        const expr = expressionToExpression(updateExpected(ctx, field.type), property.value);
        ctx.current_block.push(struct.access(property.key.name).set(expr));
    }

    // todo: zero out remaining fields
    if (fields.size !== 0) {
        throw new Error(`Struct ${type.name} has missing fields: ${Array.from(fields.keys())}`);
    }

    return struct.get();
}

function unwrapVariable(ctx: Context, variable: AssignmentExpression["left"]): MiteType {
    if (variable.type === "Identifier") {
        return lookForVariable(ctx, variable.name);
    } else if (variable.type === "MemberExpression") {
        const inner = variable.object;
        if (
            inner.type !== "Identifier" &&
            inner.type !== "MemberExpression" &&
            inner.type !== "IndexExpression"
        )
            throw new Error("Cannot unwrap non-identifier");
        const mite_type = unwrapVariable(ctx, inner);
        if (mite_type.type.classification !== "struct") throw new Error("Cannot unwrap non-struct");
        return mite_type.access(variable.property.name);
    } else if (variable.type === "IndexExpression") {
        const inner = variable.object;
        if (
            inner.type !== "Identifier" &&
            inner.type !== "MemberExpression" &&
            inner.type !== "IndexExpression"
        )
            throw new Error("Cannot unwrap non-identifier");
        const mite_type = unwrapVariable(ctx, inner);
        if (mite_type.type.classification !== "array") throw new Error("Cannot unwrap non-array");
        return mite_type.index(
            expressionToExpression(updateExpected(ctx, ctx.types.i32), variable.index)
        );
    } else {
        throw new Error(`Unknown variable type: ${variable}`);
    }
}

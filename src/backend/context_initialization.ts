// don't be offput by the fact this is 3000 lines, it's almost all boilerplate

import {
    Context,
    PrimitiveTypeInformation,
    StructTypeInformation,
    TypeInformation
} from "../types/code_gen.js";
import { Program, StructDeclaration } from "../types/nodes.js";
import { MiteType, Primitive } from "./type_classes.js";
import binaryen from "binaryen";
import { transient } from "./utils.js";

/*
export function createConversions(mod: binaryen.Module): Context["conversions"] {
    // convert from type1 to type2 is obj[type1][type2]
    return {
        i32: {
            i32: (value) => value,
            u32: (value) => ({
                type: Primitive.primitives.get("u32")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i64: (value) => ({
                type: Primitive.primitives.get("i64")!,
                ref: mod.i64.extend_s(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            // TODO: make sure extend_s is proper, should be though
            u64: (value) => ({
                type: Primitive.primitives.get("u64")!,
                ref: mod.i64.extend_s(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            f32: (value) => ({
                type: Primitive.primitives.get("f32")!,
                ref: mod.f32.convert_s.i32(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            f64: (value) => ({
                type: Primitive.primitives.get("f64")!,
                ref: mod.f64.convert_s.i32(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            i32x4: (value) => ({
                type: Primitive.primitives.get("i32x4")!,
                ref: mod.i32x4.splat(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            // TODO: remove these when i8, i16 are implemented
            i16x8: (value) => ({
                type: Primitive.primitives.get("i16x8")!,
                ref: mod.i16x8.splat(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            i8x16: (value) => ({
                type: Primitive.primitives.get("i8x16")!,
                ref: mod.i8x16.splat(value.ref),
                expression: binaryen.ExpressionIds.Unary
            })
        },
        u32: {
            i32: (value) => ({
                type: Primitive.primitives.get("i32")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            u32: (value) => value,
            i64: (value) => ({
                type: Primitive.primitives.get("i64")!,
                ref: mod.i64.extend_u(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            u64: (value) => ({
                type: Primitive.primitives.get("u64")!,
                ref: mod.i64.extend_u(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            f32: (value) => ({
                type: Primitive.primitives.get("f32")!,
                ref: mod.f32.convert_u.i32(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            f64: (value) => ({
                type: Primitive.primitives.get("f64")!,
                ref: mod.f64.convert_u.i32(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            u32x4: (value) => ({
                type: Primitive.primitives.get("u32x4")!,
                ref: mod.i32x4.splat(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            // TODO: remove these when u8, u16 are implemented
            u16x8: (value) => ({
                type: Primitive.primitives.get("u16x8")!,
                ref: mod.i16x8.splat(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            u8x16: (value) => ({
                type: Primitive.primitives.get("u8x16")!,
                ref: mod.i8x16.splat(value.ref),
                expression: binaryen.ExpressionIds.Unary
            })
        },
        i64: {
            i32: (value) => ({
                type: Primitive.primitives.get("i32")!,
                ref: mod.i32.wrap(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            u32: (value) => ({
                type: Primitive.primitives.get("u32")!,
                ref: mod.i32.wrap(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            i64: (value) => value,
            u64: (value) => ({
                type: Primitive.primitives.get("u64")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            f32: (value) => ({
                type: Primitive.primitives.get("f32")!,
                ref: mod.f32.convert_s.i64(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            f64: (value) => ({
                type: Primitive.primitives.get("f64")!,
                ref: mod.f64.convert_s.i64(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            i64x2: (value) => ({
                type: Primitive.primitives.get("i64x2")!,
                ref: mod.i64x2.splat(value.ref),
                expression: binaryen.ExpressionIds.Unary
            })
        },
        u64: {
            i32: (value) => ({
                type: Primitive.primitives.get("i32")!,
                ref: mod.i32.wrap(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            u32: (value) => ({
                type: Primitive.primitives.get("u32")!,
                ref: mod.i32.wrap(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            i64: (value) => ({
                type: Primitive.primitives.get("i64")!,
                ref: mod.i64.extend_u(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            u64: (value) => value,
            f32: (value) => ({
                type: Primitive.primitives.get("f32")!,
                ref: mod.f32.convert_u.i64(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            f64: (value) => ({
                type: Primitive.primitives.get("f64")!,
                ref: mod.f64.convert_u.i64(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            u64x2: (value) => ({
                type: Primitive.primitives.get("u64x2")!,
                ref: mod.i64x2.splat(value.ref),
                expression: binaryen.ExpressionIds.Unary
            })
        },
        f32: {
            i32: (value) => ({
                type: Primitive.primitives.get("i32")!,
                ref: mod.i32.trunc_s_sat.f32(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            u32: (value) => ({
                type: Primitive.primitives.get("u32")!,
                ref: mod.i32.trunc_u_sat.f32(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            i64: (value) => ({
                type: Primitive.primitives.get("i64")!,
                ref: mod.i64.trunc_s_sat.f32(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            u64: (value) => ({
                type: Primitive.primitives.get("u64")!,
                ref: mod.i64.trunc_u_sat.f32(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            f32: (value) => value,
            f64: (value) => ({
                type: Primitive.primitives.get("f64")!,
                ref: mod.f64.promote(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            f32x4: (value) => ({
                type: Primitive.primitives.get("f32x4")!,
                ref: mod.f32x4.splat(value.ref),
                expression: binaryen.ExpressionIds.Unary
            })
        },
        f64: {
            i32: (value) => ({
                type: Primitive.primitives.get("i32")!,
                ref: mod.i32.trunc_s_sat.f64(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            u32: (value) => ({
                type: Primitive.primitives.get("u32")!,
                ref: mod.i32.trunc_u_sat.f64(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            i64: (value) => ({
                type: Primitive.primitives.get("i64")!,
                ref: mod.i64.trunc_s_sat.f64(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            u64: (value) => ({
                type: Primitive.primitives.get("u64")!,
                ref: mod.i64.trunc_u_sat.f64(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            f32: (value) => ({
                type: Primitive.primitives.get("f32")!,
                ref: mod.f32.demote(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            f64: (value) => value,
            f64x2: (value) => ({
                type: Primitive.primitives.get("f64x2")!,
                ref: mod.f64x2.splat(value.ref),
                expression: binaryen.ExpressionIds.Unary
            })
        },
        v128: {
            v128: (value) => value,
            i8x16: (value) => ({
                type: Primitive.primitives.get("i8x16")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            u8x16: (value) => ({
                type: Primitive.primitives.get("u8x16")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i16x8: (value) => ({
                type: Primitive.primitives.get("i16x8")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            u16x8: (value) => ({
                type: Primitive.primitives.get("u16x8")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i32x4: (value) => ({
                type: Primitive.primitives.get("i32x4")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            u32x4: (value) => ({
                type: Primitive.primitives.get("u32x4")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            f32x4: (value) => ({
                type: Primitive.primitives.get("f32x4")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i64x2: (value) => ({
                type: Primitive.primitives.get("i64x2")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            u64x2: (value) => ({
                type: Primitive.primitives.get("u64x2")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            f64x2: (value) => ({
                type: Primitive.primitives.get("f64x2")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            })
        },
        i8x16: {
            v128: (value) => ({
                type: Primitive.primitives.get("v128")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i8x16: (value) => value,
            u8x16: (value) => ({
                type: Primitive.primitives.get("u8x16")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            })
        },
        u8x16: {
            v128: (value) => ({
                type: Primitive.primitives.get("v128")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i8x16: (value) => ({
                type: Primitive.primitives.get("i8x16")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            u8x16: (value) => value
        },
        i16x8: {
            v128: (value) => ({
                type: Primitive.primitives.get("v128")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i16x8: (value) => value,
            u16x8: (value) => ({
                type: Primitive.primitives.get("u16x8")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            })
        },
        u16x8: {
            v128: (value) => ({
                type: Primitive.primitives.get("v128")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i16x8: (value) => ({
                type: Primitive.primitives.get("i16x8")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            u16x8: (value) => value
        },
        i32x4: {
            v128: (value) => ({
                type: Primitive.primitives.get("v128")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i32x4: (value) => value,
            u32x4: (value) => ({
                type: Primitive.primitives.get("u32x4")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            f32x4: (value) => ({
                type: Primitive.primitives.get("f32x4")!,
                ref: mod.f32x4.convert_i32x4_s(value.ref),
                expression: binaryen.ExpressionIds.Unary
            })
        },
        u32x4: {
            v128: (value) => ({
                type: Primitive.primitives.get("v128")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i32x4: (value) => ({
                type: Primitive.primitives.get("i32x4")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            u32x4: (value) => value,
            f32x4: (value) => ({
                type: Primitive.primitives.get("f32x4")!,
                ref: mod.f32x4.convert_i32x4_u(value.ref),
                expression: binaryen.ExpressionIds.Unary
            })
        },
        f32x4: {
            v128: (value) => ({
                type: Primitive.primitives.get("v128")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i32x4: (value) => ({
                type: Primitive.primitives.get("i32x4")!,
                ref: mod.i32x4.trunc_sat_f32x4_s(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            u32x4: (value) => ({
                type: Primitive.primitives.get("u32x4")!,
                ref: mod.i32x4.trunc_sat_f32x4_u(value.ref),
                expression: binaryen.ExpressionIds.Unary
            }),
            f32x4: (value) => value
        },
        i64x2: {
            v128: (value) => ({
                type: Primitive.primitives.get("v128")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i64x2: (value) => value,
            u64x2: (value) => ({
                type: Primitive.primitives.get("u64x2")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            })
        },
        u64x2: {
            v128: (value) => ({
                type: Primitive.primitives.get("v128")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            i64x2: (value) => ({
                type: Primitive.primitives.get("i64x2")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            u64x2: (value) => value
        },
        f64x2: {
            v128: (value) => ({
                type: Primitive.primitives.get("v128")!,
                ref: value.ref,
                expression: binaryen.ExpressionIds.Unary
            }),
            f64x2: (value) => value
        }
    };
}
*/

export function createIntrinsics(ctx: Context): Context["intrinsics"] {
    const unary_op =
        (
            operation: (expr: binaryen.ExpressionRef) => binaryen.ExpressionRef,
            result?: PrimitiveTypeInformation
        ) =>
        (expr: MiteType): MiteType => {
            return transient(
                ctx,
                result ?? (expr as Primitive).type,
                operation(expr.get_expression_ref())
            );
        };
    const bin_op =
        (
            operation: (
                left: binaryen.ExpressionRef,
                right: binaryen.ExpressionRef
            ) => binaryen.ExpressionRef,
            result?: PrimitiveTypeInformation
        ) =>
        (left: MiteType, right: MiteType): MiteType => {
            return transient(
                ctx,
                result ?? (left as Primitive).type,
                operation(left.get_expression_ref(), right.get_expression_ref())
            );
        };
    const ternary_op =
        (
            operation: (
                first: binaryen.ExpressionRef,
                second: binaryen.ExpressionRef,
                third: binaryen.ExpressionRef
            ) => binaryen.ExpressionRef,
            result?: PrimitiveTypeInformation
        ) =>
        (first: MiteType, second: MiteType, third: MiteType): MiteType => {
            return transient(
                ctx,
                result ?? (first as Primitive).type,
                operation(
                    first.get_expression_ref(),
                    second.get_expression_ref(),
                    third.get_expression_ref()
                )
            );
        };

    return {
        void: {},
        f32: {
            sqrt: unary_op(ctx.mod.f32.sqrt),
            ceil: unary_op(ctx.mod.f32.ceil),
            floor: unary_op(ctx.mod.f32.floor),
            trunc: unary_op(ctx.mod.f32.trunc),
            nearest: unary_op(ctx.mod.f32.nearest),
            abs: unary_op(ctx.mod.f32.abs),
            copysign: bin_op(ctx.mod.f32.copysign),
            min: bin_op(ctx.mod.f32.min),
            max: bin_op(ctx.mod.f32.max),
            reinterpret: unary_op(ctx.mod.f32.reinterpret, Primitive.primitives.get("i32")!)
        },
        f64: {
            sqrt: unary_op(ctx.mod.f64.sqrt),
            ceil: unary_op(ctx.mod.f64.ceil),
            floor: unary_op(ctx.mod.f64.floor),
            trunc: unary_op(ctx.mod.f64.trunc),
            nearest: unary_op(ctx.mod.f64.nearest),
            abs: unary_op(ctx.mod.f64.abs),
            copysign: bin_op(ctx.mod.f64.copysign),
            min: bin_op(ctx.mod.f64.min),
            max: bin_op(ctx.mod.f64.max),
            reinterpret: unary_op(ctx.mod.f64.reinterpret, Primitive.primitives.get("i64")!)
        },
        i32: {
            clz: unary_op(ctx.mod.i32.clz),
            ctz: unary_op(ctx.mod.i32.ctz),
            popcnt: unary_op(ctx.mod.i32.popcnt),
            rotl: bin_op(ctx.mod.i32.rotl),
            rotr: bin_op(ctx.mod.i32.rotr),
            reinterpret: unary_op(ctx.mod.i32.reinterpret, Primitive.primitives.get("f32")!)
        },
        u32: {
            clz: unary_op(ctx.mod.i32.clz),
            ctz: unary_op(ctx.mod.i32.ctz),
            popcnt: unary_op(ctx.mod.i32.popcnt),
            rotl: bin_op(ctx.mod.i32.rotl),
            rotr: bin_op(ctx.mod.i32.rotr),
            reinterpret: unary_op(ctx.mod.i32.reinterpret, Primitive.primitives.get("f32")!)
        },
        i64: {
            clz: unary_op(ctx.mod.i64.clz),
            ctz: unary_op(ctx.mod.i64.ctz),
            popcnt: unary_op(ctx.mod.i64.popcnt),
            rotl: bin_op(ctx.mod.i64.rotl),
            rotr: bin_op(ctx.mod.i64.rotr),
            reinterpret: unary_op(ctx.mod.i64.reinterpret, Primitive.primitives.get("f64")!)
        },
        u64: {
            clz: unary_op(ctx.mod.i64.clz),
            ctz: unary_op(ctx.mod.i64.ctz),
            popcnt: unary_op(ctx.mod.i64.popcnt),
            rotl: bin_op(ctx.mod.i64.rotl),
            rotr: bin_op(ctx.mod.i64.rotr),
            reinterpret: unary_op(ctx.mod.i64.reinterpret, Primitive.primitives.get("f64")!)
        },
        v128: {
            bitselect: ternary_op(ctx.mod.v128.bitselect),
            andnot: bin_op(ctx.mod.v128.andnot),
            any_true: unary_op(ctx.mod.v128.any_true, Primitive.primitives.get("i32")!)
        },
        i8x16: {
            bitselect: ternary_op(ctx.mod.v128.bitselect),
            andnot: bin_op(ctx.mod.v128.andnot),
            any_true: unary_op(ctx.mod.v128.any_true, Primitive.primitives.get("i32")!),
            swizzle: bin_op(ctx.mod.i8x16.swizzle),
            all_true: unary_op(ctx.mod.i8x16.all_true, Primitive.primitives.get("i32")!),
            bitmask: unary_op(ctx.mod.i8x16.bitmask),
            popcnt: unary_op(ctx.mod.i8x16.popcnt),
            add_sat: bin_op(ctx.mod.i8x16.add_saturate_s),
            sub_sat: bin_op(ctx.mod.i8x16.sub_saturate_s),
            min: bin_op(ctx.mod.i8x16.min_s),
            max: bin_op(ctx.mod.i8x16.max_s),
            dot: bin_op(ctx.mod.i32x4.dot_i16x8_s),
            extmul_low: bin_op(ctx.mod.i16x8.extmul_low_i8x16_s),
            extmul_high: bin_op(ctx.mod.i16x8.extmul_high_i8x16_s),
            extadd_pairwise: unary_op(ctx.mod.i16x8.extadd_pairwise_i8x16_s),
            extend_low: unary_op(ctx.mod.i16x8.extend_low_i8x16_s),
            extend_high: unary_op(ctx.mod.i16x8.extend_high_i8x16_s),
            extract(value, index) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                return transient(
                    ctx,
                    Primitive.primitives.get("i32")!,
                    ctx.mod.i8x16.extract_lane_s(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref())
                    )
                );
            },
            replace(value, index, replacement) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                return transient(
                    ctx,
                    Primitive.primitives.get("i8x16")!,
                    ctx.mod.i8x16.replace_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref()),
                        replacement.get_expression_ref()
                    )
                );
            }
        },
        u8x16: {
            bitselect: ternary_op(ctx.mod.v128.bitselect),
            andnot: bin_op(ctx.mod.v128.andnot),
            any_true: unary_op(ctx.mod.v128.any_true, Primitive.primitives.get("i32")!),
            swizzle: bin_op(ctx.mod.i8x16.swizzle),
            all_true: unary_op(ctx.mod.i8x16.all_true, Primitive.primitives.get("i32")!),
            bitmask: unary_op(ctx.mod.i8x16.bitmask),
            popcnt: unary_op(ctx.mod.i8x16.popcnt),
            add_sat: bin_op(ctx.mod.i8x16.add_saturate_u),
            sub_sat: bin_op(ctx.mod.i8x16.sub_saturate_u),
            min: bin_op(ctx.mod.i8x16.min_u),
            max: bin_op(ctx.mod.i8x16.max_u),
            avgr: bin_op(ctx.mod.i8x16.avgr_u),
            extmul_low: bin_op(ctx.mod.i16x8.extmul_low_i8x16_u),
            extmul_high: bin_op(ctx.mod.i16x8.extmul_high_i8x16_u),
            extadd_pairwise: unary_op(ctx.mod.i16x8.extadd_pairwise_i8x16_u),
            extend_low: unary_op(ctx.mod.i16x8.extend_low_i8x16_u),
            extend_high: unary_op(ctx.mod.i16x8.extend_high_i8x16_u),
            extract(value, index) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                return transient(
                    ctx,
                    Primitive.primitives.get("i32")!,
                    ctx.mod.i8x16.extract_lane_u(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref())
                    )
                );
            },
            replace(value, index, replacement) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                return transient(
                    ctx,
                    Primitive.primitives.get("u8x16")!,
                    ctx.mod.i8x16.replace_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref()),
                        replacement.get_expression_ref()
                    )
                );
            }
        },
        i16x8: {
            bitselect: ternary_op(ctx.mod.v128.bitselect),
            andnot: bin_op(ctx.mod.v128.andnot),
            any_true: unary_op(ctx.mod.v128.any_true, Primitive.primitives.get("i32")!),
            all_true: unary_op(ctx.mod.i16x8.all_true, Primitive.primitives.get("i32")!),
            bitmask: unary_op(ctx.mod.i16x8.bitmask),
            add_sat: bin_op(ctx.mod.i16x8.add_saturate_s),
            sub_sat: bin_op(ctx.mod.i16x8.sub_saturate_s),
            min: bin_op(ctx.mod.i16x8.min_s),
            max: bin_op(ctx.mod.i16x8.max_s),
            q15mulr: bin_op(ctx.mod.i16x8.q15mulr_sat_s),
            extmul_low: bin_op(ctx.mod.i32x4.extmul_low_i16x8_s),
            extmul_high: bin_op(ctx.mod.i32x4.extmul_high_i16x8_s),
            extadd_pairwise: unary_op(ctx.mod.i32x4.extadd_pairwise_i16x8_s),
            extend_low: unary_op(ctx.mod.i32x4.extend_low_i16x8_s),
            extend_high: unary_op(ctx.mod.i32x4.extend_high_i16x8_s),
            narrow: bin_op(ctx.mod.i8x16.narrow_i16x8_s),
            extract(value, index) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                return transient(
                    ctx,
                    Primitive.primitives.get("i32")!,
                    ctx.mod.i16x8.extract_lane_s(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref())
                    )
                );
            },
            replace(value, index, replacement) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                return transient(
                    ctx,
                    Primitive.primitives.get("i16x8")!,
                    ctx.mod.i16x8.replace_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref()),
                        replacement.get_expression_ref()
                    )
                );
            }
        },
        u16x8: {
            bitselect: ternary_op(ctx.mod.v128.bitselect),
            andnot: bin_op(ctx.mod.v128.andnot),
            any_true: unary_op(ctx.mod.v128.any_true, Primitive.primitives.get("i32")!),
            all_true: unary_op(ctx.mod.i16x8.all_true, Primitive.primitives.get("i32")!),
            bitmask: unary_op(ctx.mod.i16x8.bitmask),
            add_sat: bin_op(ctx.mod.i16x8.add_saturate_u),
            sub_sat: bin_op(ctx.mod.i16x8.sub_saturate_u),
            min: bin_op(ctx.mod.i16x8.min_u),
            max: bin_op(ctx.mod.i16x8.max_u),
            avgr: bin_op(ctx.mod.i16x8.avgr_u),
            extmul_low: bin_op(ctx.mod.i32x4.extmul_low_i16x8_u),
            extmul_high: bin_op(ctx.mod.i32x4.extmul_high_i16x8_u),
            extadd_pairwise: unary_op(ctx.mod.i32x4.extadd_pairwise_i16x8_u),
            extend_low: unary_op(ctx.mod.i32x4.extend_low_i16x8_u),
            extend_high: unary_op(ctx.mod.i32x4.extend_high_i16x8_u),
            narrow: bin_op(ctx.mod.i8x16.narrow_i16x8_u),
            extract(value, index) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                return transient(
                    ctx,
                    Primitive.primitives.get("i32")!,
                    ctx.mod.i16x8.extract_lane_u(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref())
                    )
                );
            },
            replace(value, index, replacement) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                return transient(
                    ctx,
                    Primitive.primitives.get("u16x8")!,
                    ctx.mod.i16x8.replace_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref()),
                        replacement.get_expression_ref()
                    )
                );
            }
        },
        i32x4: {
            bitselect: ternary_op(ctx.mod.v128.bitselect),
            andnot: bin_op(ctx.mod.v128.andnot),
            any_true: unary_op(ctx.mod.v128.any_true, Primitive.primitives.get("i32")!),
            all_true: unary_op(ctx.mod.i32x4.all_true, Primitive.primitives.get("i32")!),
            bitmask: unary_op(ctx.mod.i32x4.bitmask),
            abs: unary_op(ctx.mod.i32x4.abs),
            min: bin_op(ctx.mod.i32x4.min_s),
            max: bin_op(ctx.mod.i32x4.max_s),
            extmul_low: bin_op(ctx.mod.i64x2.extmul_low_i32x4_s),
            extmul_high: bin_op(ctx.mod.i64x2.extmul_high_i32x4_s),
            extend_high: unary_op(ctx.mod.i64x2.extend_high_i32x4_s),
            extend_low: unary_op(ctx.mod.i64x2.extend_low_i32x4_s),
            narrow: bin_op(ctx.mod.i16x8.narrow_i32x4_s),
            extract(value, index) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                return transient(
                    ctx,
                    Primitive.primitives.get("i32")!,
                    ctx.mod.i32x4.extract_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref())
                    )
                );
            },
            replace(value, index, replacement) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                return transient(
                    ctx,
                    Primitive.primitives.get("i32x4")!,
                    ctx.mod.i32x4.replace_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref()),
                        replacement.get_expression_ref()
                    )
                );
            }
        },
        u32x4: {
            bitselect: ternary_op(ctx.mod.v128.bitselect),
            andnot: bin_op(ctx.mod.v128.andnot),
            any_true: unary_op(ctx.mod.v128.any_true, Primitive.primitives.get("i32")!),
            all_true: unary_op(ctx.mod.i32x4.all_true, Primitive.primitives.get("i32")!),
            bitmask: unary_op(ctx.mod.i32x4.bitmask),
            abs: unary_op(ctx.mod.i32x4.abs),
            min: bin_op(ctx.mod.i32x4.min_u),
            max: bin_op(ctx.mod.i32x4.max_u),
            extmul_low: bin_op(ctx.mod.i64x2.extmul_low_i32x4_u),
            extmul_high: bin_op(ctx.mod.i64x2.extmul_high_i32x4_u),
            extend_high: unary_op(ctx.mod.i64x2.extend_high_i32x4_u),
            extend_low: unary_op(ctx.mod.i64x2.extend_low_i32x4_u),
            narrow: bin_op(ctx.mod.i16x8.narrow_i32x4_u),
            extract(value, index) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                return transient(
                    ctx,
                    Primitive.primitives.get("i32")!,
                    ctx.mod.i32x4.extract_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref())
                    )
                );
            },
            replace(value, index, replacement) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                return transient(
                    ctx,
                    Primitive.primitives.get("u32x4")!,
                    ctx.mod.i32x4.replace_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref()),
                        replacement.get_expression_ref()
                    )
                );
            }
        },
        i64x2: {
            bitselect: ternary_op(ctx.mod.v128.bitselect),
            andnot: bin_op(ctx.mod.v128.andnot),
            any_true: unary_op(ctx.mod.v128.any_true, Primitive.primitives.get("i32")!),
            all_true: unary_op(ctx.mod.i64x2.all_true, Primitive.primitives.get("i32")!),
            bitmask: unary_op(ctx.mod.i64x2.bitmask),
            abs: unary_op(ctx.mod.i64x2.abs),
            extract(value, index) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                const result = transient(
                    ctx,
                    Primitive.primitives.get("i64")!,
                    ctx.mod.i64x2.extract_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref())
                    )
                );
                return result;
            },
            replace(value, index, replacement) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");
                const result = transient(
                    ctx,
                    Primitive.primitives.get("i64x2")!,
                    ctx.mod.i64x2.replace_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref()),
                        replacement.get_expression_ref()
                    )
                );
                return result;
            }
        },
        u64x2: {
            bitselect: ternary_op(ctx.mod.v128.bitselect),
            andnot: bin_op(ctx.mod.v128.andnot),
            any_true: unary_op(ctx.mod.v128.any_true, Primitive.primitives.get("i32")!),
            all_true: unary_op(ctx.mod.i64x2.all_true, Primitive.primitives.get("i32")!),
            bitmask: unary_op(ctx.mod.i64x2.bitmask),
            abs: unary_op(ctx.mod.i64x2.abs),
            extract(value, index) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");

                return transient(
                    ctx,
                    Primitive.primitives.get("i64")!,
                    ctx.mod.i64x2.extract_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref())
                    )
                );
            },
            replace(value, index, replacement) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");

                return transient(
                    ctx,
                    Primitive.primitives.get("u64x2")!,
                    ctx.mod.i64x2.replace_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref()),
                        replacement.get_expression_ref()
                    )
                );
            }
        },
        f32x4: {
            bitselect: ternary_op(ctx.mod.v128.bitselect),
            andnot: bin_op(ctx.mod.v128.andnot),
            any_true: unary_op(ctx.mod.v128.any_true, Primitive.primitives.get("i32")!),
            abs: unary_op(ctx.mod.f32x4.abs),
            sqrt: unary_op(ctx.mod.f32x4.sqrt),
            min: bin_op(ctx.mod.f32x4.min),
            max: bin_op(ctx.mod.f32x4.max),
            pmin: bin_op(ctx.mod.f32x4.pmin),
            pmax: bin_op(ctx.mod.f32x4.pmax),
            ceil: unary_op(ctx.mod.f32x4.ceil),
            floor: unary_op(ctx.mod.f32x4.floor),
            trunc: unary_op(ctx.mod.f32x4.trunc),
            nearest: unary_op(ctx.mod.f32x4.nearest),
            trunc_sat_s: unary_op(ctx.mod.i32x4.trunc_sat_f32x4_s),
            trunc_sat_u: unary_op(ctx.mod.i32x4.trunc_sat_f32x4_u),
            promote_low: unary_op(ctx.mod.f64x2.promote_low_f32x4),
            extract(value, index) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");

                return transient(
                    ctx,
                    Primitive.primitives.get("f32")!,
                    ctx.mod.f32x4.extract_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref())
                    )
                );
            },
            replace(value, index, replacement) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");

                return transient(
                    ctx,
                    Primitive.primitives.get("f32x4")!,
                    ctx.mod.f32x4.replace_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref()),
                        replacement.get_expression_ref()
                    )
                );
            }
        },
        f64x2: {
            bitselect: ternary_op(ctx.mod.v128.bitselect),
            andnot: bin_op(ctx.mod.v128.andnot),
            any_true: unary_op(ctx.mod.v128.any_true, Primitive.primitives.get("i32")!),
            abs: unary_op(ctx.mod.f64x2.abs),
            sqrt: unary_op(ctx.mod.f64x2.sqrt),
            min: bin_op(ctx.mod.f64x2.min),
            max: bin_op(ctx.mod.f64x2.max),
            pmin: bin_op(ctx.mod.f64x2.pmin),
            pmax: bin_op(ctx.mod.f64x2.pmax),
            ceil: unary_op(ctx.mod.f64x2.ceil),
            floor: unary_op(ctx.mod.f64x2.floor),
            trunc: unary_op(ctx.mod.f64x2.trunc),
            nearest: unary_op(ctx.mod.f64x2.nearest),
            trunc_sat_zero_s: unary_op(ctx.mod.i32x4.trunc_sat_f64x2_s_zero),
            trunc_sat_zero_u: unary_op(ctx.mod.i32x4.trunc_sat_f64x2_u_zero),
            demote_zero: unary_op(ctx.mod.f32x4.demote_f64x2_zero),
            extract(value, index) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");

                return transient(
                    ctx,
                    Primitive.primitives.get("f64")!,
                    ctx.mod.f64x2.extract_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref())
                    )
                );
            },
            replace(value, index, replacement) {
                if (
                    binaryen.getExpressionId(index.get_expression_ref()) !==
                    binaryen.ExpressionIds.Const
                )
                    throw new Error("Expected constant extraction index");

                return transient(
                    ctx,
                    Primitive.primitives.get("f64x2")!,
                    ctx.mod.f64x2.replace_lane(
                        value.get_expression_ref(),
                        // @ts-expect-error undocumented function
                        binaryen._BinaryenConstGetValueI32(index.get_expression_ref()),
                        replacement.get_expression_ref()
                    )
                );
            }
        }
    };
}

/*
this is going to have to be:
1. identify all structs in the file (eventually including imports)
2. create dependency graph of which structs depend on which other structs
3. topologically sort the structs (if there are any cycles, throw an error)
4. determine sizeofs in that order
*/
export function identifyStructs(program: Program): TypeInformation[] {
    const struct_declarations = Object.fromEntries(
        program.body
            .filter((x): x is StructDeclaration => x.type === "StructDeclaration")
            .map((x) => [x.id.name, x])
    );
    const adj_list = new Map(
        Object.entries(struct_declarations).map(([id, { fields }]) => [
            id,
            new Set(
                fields
                    .map(({ typeAnnotation }) => typeAnnotation.name)
                    .filter((name) => !Primitive.primitives.has(name))
            )
        ])
    ) as Map<string, Set<string>>;

    // detect cycles
    const cycle_error = detectCycles(adj_list);
    if (cycle_error) throw cycle_error;

    const top_sorted_structs = topologicalSort(adj_list);
    if (top_sorted_structs.length !== Object.keys(struct_declarations).length) {
        throw new Error("Struct dependency graph is not connected, this is a compiler bug");
    }
    top_sorted_structs.reverse();

    const types = new Map<string, StructTypeInformation>();
    for (const struct of top_sorted_structs) {
        types.set(struct, structDeclarationToTypeInformation(types, struct_declarations[struct]));
    }
    return Array.from(types.values());
}

function detectCycles(adj_list: Map<string, Set<string>>): Error | null {
    const seen = new Set();
    for (const struct of adj_list.keys()) {
        if (seen.has(struct)) continue;
        const stack = [struct];
        const visited = new Set();
        while (stack.length > 0) {
            const vertex = stack.pop()!;
            if (visited.has(vertex)) {
                return new Error(`Struct dependency cycle detected: ${vertex} uses itself`);
            }
            visited.add(vertex);
            seen.add(vertex);
            for (const adj_vertex of adj_list.get(vertex)!) {
                stack.push(adj_vertex);
            }
        }
    }
    return null;
}

// and they said i would never use data structures and algorithms in real life....
function topologicalSort(adj_list: Map<string, Set<string>>): string[] {
    // kahn's algorithm
    const L: string[] = [];

    const has_incoming_edge = new Set(Array.from(adj_list.values(), (x) => Array.from(x)).flat());
    const S = Array.from(adj_list.keys()).filter((x) => !has_incoming_edge.has(x));

    // awful efficiency, should reverse the adjacency list and use a real queue
    // doesn't matter though because small N
    while (S.length) {
        const n = S.shift()!;
        L.push(n);
        for (const m of adj_list.get(n)!) {
            adj_list.get(n)!.delete(m);
            if (!Array.from(adj_list.values()).some((x) => x.has(m))) {
                S.push(m);
            }
        }
    }

    return L;
}

function structDeclarationToTypeInformation(
    structs: Map<string, StructTypeInformation>,
    node: StructDeclaration
): StructTypeInformation {
    const type: Omit<StructTypeInformation, "sizeof"> = {
        classification: "struct",
        name: node.id.name,
        fields: new Map()
    };

    let offset = 0;
    for (const { name, typeAnnotation } of node.fields) {
        if (Primitive.primitives.has(typeAnnotation.name)) {
            const sizeof = Primitive.sizeof(typeAnnotation.name)!;
            type.fields.set(name.name, {
                type: Primitive.primitives.get(typeAnnotation.name)!,
                offset,
                is_ref: typeAnnotation.isRef ?? false
            });
            // TODO: alignment
            offset += sizeof;
        } else if (structs.has(typeAnnotation.name)) {
            const struct = structs.get(typeAnnotation.name)!;
            type.fields.set(name.name, {
                type: struct,
                offset,
                is_ref: typeAnnotation.isRef ?? false
            });
            offset += struct.sizeof;
        } else {
            // probably array
            throw new Error(`Unknown type: ${typeAnnotation.name}`);
        }
    }

    return { ...type, sizeof: offset };
}

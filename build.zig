const std = @import("std");

pub fn build(b: *std.Build) void {
    const build_steps = .{
        .wasm = b.step("wasm", "Build wasm"),
    };

    const optimize = b.standardOptimizeOption(.{});
    const mod = build_project_module(b);
    build_wasm(b, build_steps.wasm, .{
        .mod = mod,
        .target = b.standardTargetOptions(.{
            .default_target = .{
                .cpu_arch = .wasm32,
                .os_tag = .freestanding,
            },
        }),
        .optimize = optimize,
    });
}

fn build_project_module(b: *std.Build) *std.Build.Module {
    const mod = b.addModule("zig-ini", .{
        .root_source_file = b.path("zig/mod.zig"),
    });
    return mod;
}

fn build_wasm(
    b: *std.Build,
    step_wasm: *std.Build.Step,
    options: struct {
        mod: *std.Build.Module,
        target: std.Build.ResolvedTarget,
        optimize: std.builtin.OptimizeMode,
    },
) void {
    _ = options; // autofix

    _ = step_wasm; // autofix}
    const wasm_generate = b.addExecutable(.{});
    _ = wasm_generate; // autofix
}

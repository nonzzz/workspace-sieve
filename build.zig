const std = @import("std");

pub fn build(b: *std.Build) void {
    const build_steps = .{
        .wasm = b.step("wasm", "Build wasm"),
    };

    const optimize = b.standardOptimizeOption(.{});
    build_wasm(b, build_steps.wasm, .{
        .target = b.standardTargetOptions(.{
            .default_target = .{
                .cpu_arch = .wasm32,
                .os_tag = .freestanding,
            },
        }),
        .optimize = optimize,
    });
}

fn build_wasm(
    b: *std.Build,
    step_wasm: *std.Build.Step,
    options: struct {
        target: std.Build.ResolvedTarget,
        optimize: std.builtin.OptimizeMode,
    },
) void {
    const wasm_generate = b.addExecutable(.{
        .name = "zig-lib",
        .root_source_file = b.path("zig/mod.zig"),
        .target = options.target,
        .optimize = .ReleaseSmall,
    });
    wasm_generate.rdynamic = true;
    wasm_generate.entry = .disabled;

    step_wasm.dependOn(&b.addInstallFile(wasm_generate.getEmittedBin(), b.pathJoin(
        &.{
            "../zig",
            "zig-lib.wasm",
        },
    )).step);

    var write_build_script = b.addSystemCommand(&.{
        "./node_modules/.bin/rollup",
        "-c",
        "rollup.config.mjs",
    });
    step_wasm.dependOn(&write_build_script.step);
}

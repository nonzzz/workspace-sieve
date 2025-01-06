const std = @import("std");

pub fn build(b: *std.Build) void {
    const build_text = b.addTest(.{
        .root_source_file = b.path("src/mod.zig"),
        .target = b.resolveTargetQuery(.{}),
        .optimize = b.standardOptimizeOption(.{}),
    });

    const run_test = b.addRunArtifact(build_text);
    const run_test_step = b.step("test", "testing");
    run_test_step.dependOn(&run_test.step);

    const build_wasm = b.addExecutable(.{
        .name = "lex-selector.wasm",
        .root_source_file = b.path("src/wasm.zig"),
        .target = b.resolveTargetQuery(.{
            .cpu_arch = .wasm32,
            .os_tag = .freestanding,
        }),
        .optimize = .ReleaseSmall,
    });

    build_wasm.rdynamic = true;
    build_wasm.entry = .disabled;

    const build_wasm_step = b.step("wasm", "wasm output");

    build_wasm_step.dependOn(&b.addInstallFile(build_wasm.getEmittedBin(), b.pathJoin(&.{
        "../src",
        "lex-selector.wasm",
    })).step);
}

const std = @import("std");
const builtin = @import("builtin");

pub fn build(b: *std.Build) !void {
    const build_steps = .{
        .lib = b.step("lib", "Build library"),
        .unit_test = b.step("test", "Run tests"),
        .analysis = b.step("analysis", "Run analysis"),
    };

    const optimize = b.standardOptimizeOption(.{});
    const wasm_target = b.standardTargetOptions(.{
        .default_target = .{
            .cpu_arch = .wasm32,
            .os_tag = .freestanding,
        },
    });
    build_lib(b, build_steps.lib, .{
        .target = wasm_target,
        .optimize = optimize,
        .analysis = false,
    });
    build_test(b, build_steps.unit_test, .{
        .target = try resolve_target(b, .{}),
        .optimize = optimize,
    });
    const analysis_target = wasm_target;
    build_lib(b, build_steps.analysis, .{
        .target = analysis_target,
        .optimize = optimize,
        .analysis = true,
    });
}

fn build_lib(
    b: *std.Build,
    step_wasm: *std.Build.Step,
    options: struct {
        target: std.Build.ResolvedTarget,
        optimize: std.builtin.OptimizeMode,
        analysis: bool = false,
    },
) void {
    const lib_generate = b.addExecutable(.{
        .name = "zig-lib",
        .root_source_file = b.path("zig/mod.zig"),
        .target = options.target,
        .optimize = .ReleaseSmall,
    });
    lib_generate.rdynamic = true;
    lib_generate.entry = .disabled;
    step_wasm.dependOn(&b.addInstallFile(lib_generate.getEmittedBin(), b.pathJoin(
        &.{
            "zig-lib.wasm",
        },
    )).step);

    var write_build_script = b.addSystemCommand(&.{
        "./node_modules/.bin/rolldown",
        "-c",
        "rolldown.config.mts",
    });
    if (options.analysis) {
        write_build_script.setEnvironmentVariable("ENABLE_ANALYZER", "true"); // 添加环境变量
    }
    write_build_script.step.dependOn(&lib_generate.step);
    step_wasm.dependOn(&write_build_script.step);
}

fn build_test(
    b: *std.Build,
    step_test: *std.Build.Step,
    options: struct {
        target: std.Build.ResolvedTarget,
        optimize: std.builtin.OptimizeMode,
    },
) void {
    const pattern_test = b.addTest(.{
        .name = "pattern-test",
        .root_source_file = b.path("zig/pattern.zig"),
        .target = options.target,
        .optimize = options.optimize,
    });

    // Create run step for pattern test
    const run_pattern_test = b.addRunArtifact(pattern_test);
    step_test.dependOn(&run_pattern_test.step);
}

fn resolve_target(b: *std.Build, target_requested: std.Target.Query) !std.Build.ResolvedTarget {
    var target: std.Target.Query = .{
        .cpu_arch = builtin.target.cpu.arch,
        .os_tag = builtin.target.os.tag,
    };

    if (target_requested.cpu_arch) |cpu_arch| {
        target.cpu_arch = cpu_arch;
    }

    if (target_requested.os_tag) |os_tag| {
        target.os_tag = os_tag;
    }

    const targets: []const std.Target.Query = &.{
        .{ .cpu_arch = .aarch64, .os_tag = .macos },
        .{ .cpu_arch = .x86_64, .os_tag = .linux },
        .{ .cpu_arch = .x86_64, .os_tag = .windows },
        .{ .cpu_arch = .aarch64, .os_tag = .windows },
        .{ .cpu_arch = .wasm32, .os_tag = .freestanding },
    };
    for (targets) |query| {
        if (query.cpu_arch == target.cpu_arch and query.os_tag == target.os_tag) {
            return b.resolveTargetQuery(query);
        }
    }
    return error.UnsupportedTarget;
}

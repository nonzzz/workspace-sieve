const std = @import("std");
const zbench = @import("zbench");
const pattern = @import("./pattern.zig");

var global_allocator: std.mem.Allocator = undefined;
var global_inputs: [][]const u8 = undefined;
var simple_matcher: pattern.PatternMatcher = undefined;
var complex_matcher: pattern.PatternMatcher = undefined;
var multi_matchers: []pattern.PatternMatcher = undefined;

fn generateInputs(allocator: std.mem.Allocator, count: usize) [][]const u8 {
    const prefixes = [_][]const u8{ "eslint-", "webpack-", "babel-", "@vue/", "@react/", "rollup-", "vite-" };
    const types = [_][]const u8{ "plugin", "config", "preset", "loader", "parser", "core" };
    const suffixes = [_][]const u8{ "-js", "-ts", "-jsx", "-vue", "-svelte", "-react", "" };

    var inputs = allocator.alloc([]const u8, count) catch @panic("Out of memory");

    for (0..count) |i| {
        const prefix = prefixes[i % prefixes.len];
        const type_str = types[(i / prefixes.len) % types.len];
        const suffix = suffixes[i % suffixes.len];

        var buffer = std.ArrayList(u8).init(allocator);
        buffer.appendSlice(prefix) catch @panic("Out of memory");
        buffer.appendSlice(type_str) catch @panic("Out of memory");
        buffer.appendSlice(suffix) catch @panic("Out of memory");
        buffer.append('-') catch @panic("Out of memory");
        buffer.writer().print("{d}", .{i}) catch @panic("Out of memory");

        inputs[i] = buffer.toOwnedSlice() catch @panic("Out of memory");
    }

    return inputs;
}

fn setupBenchmarks(allocator: std.mem.Allocator) !void {
    global_allocator = allocator;

    global_inputs = generateInputs(allocator, 1000);

    simple_matcher = try pattern.PatternMatcher.init(allocator, &[_][]const u8{"eslint-*"});

    complex_matcher = try pattern.PatternMatcher.init(allocator, &[_][]const u8{ "eslint-*", "!eslint-plugin-*", "eslint-plugin-react", "*loader" });

    const pattern_matrices = [_][]const []const u8{
        &[_][]const u8{"*"},
        &[_][]const u8{"eslint-*"},
        &[_][]const u8{"*plugin*"},
        &[_][]const u8{ "eslint-*", "!eslint-plugin-bar" },
        &[_][]const u8{ "!eslint-plugin-bar", "eslint-*" },
    };

    multi_matchers = try allocator.alloc(pattern.PatternMatcher, pattern_matrices.len);
    for (pattern_matrices, 0..) |rules, i| {
        multi_matchers[i] = try pattern.PatternMatcher.init(allocator, rules);
    }
}

fn teardownBenchmarks() void {
    for (global_inputs) |input| {
        global_allocator.free(input);
    }
    global_allocator.free(global_inputs);

    simple_matcher.deinit();
    complex_matcher.deinit();

    for (multi_matchers) |*matcher| {
        matcher.deinit();
    }
    global_allocator.free(multi_matchers);
}

fn benchSimplePatternMatching(_: std.mem.Allocator) void {
    for (global_inputs) |input| {
        _ = simple_matcher.match_any(input);
    }
}

fn benchComplexPatternMatching(_: std.mem.Allocator) void {
    for (global_inputs) |input| {
        _ = complex_matcher.match_any(input);
    }
}

fn benchMultipleMatchersConcurrency(_: std.mem.Allocator) void {
    for (multi_matchers) |matcher| {
        for (global_inputs) |input| {
            _ = matcher.match_any(input);
        }
    }
}

pub fn main() !void {
    const allocator = std.heap.page_allocator;
    const stdout = std.io.getStdOut().writer();

    try setupBenchmarks(allocator);
    defer teardownBenchmarks();

    var bench = zbench.Benchmark.init(allocator, .{});
    defer bench.deinit();

    try bench.add("Simple Pattern Matching", benchSimplePatternMatching, .{});
    try bench.add("Complex Pattern Matching", benchComplexPatternMatching, .{});
    try bench.add("Multiple Matchers Concurrency", benchMultipleMatchersConcurrency, .{});

    try stdout.writeAll("\n");
    try bench.run(stdout);
}

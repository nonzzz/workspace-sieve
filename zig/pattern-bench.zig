const std = @import("std");
const zbench = @import("zbench");
const pattern = @import("./pattern.zig");

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

fn benchSimplePatternMatching(allocator: std.mem.Allocator) void {
    const inputs = generateInputs(allocator, 1000);
    defer {
        for (inputs) |input| {
            allocator.free(input);
        }
        allocator.free(inputs);
    }

    var matcher = pattern.PatternMatcher.init(allocator, &[_][]const u8{"eslint-*"}) catch @panic("Failed to init matcher");
    defer matcher.deinit();

    for (inputs) |input| {
        _ = matcher.match_any(input);
    }
}

fn benchComplexPatternMatching(allocator: std.mem.Allocator) void {
    const inputs = generateInputs(allocator, 1000);
    defer {
        for (inputs) |input| {
            allocator.free(input);
        }
        allocator.free(inputs);
    }

    var matcher = pattern.PatternMatcher.init(allocator, &[_][]const u8{ "eslint-*", "!eslint-plugin-*", "eslint-plugin-react", "*loader" }) catch @panic("Failed to init matcher");
    defer matcher.deinit();

    for (inputs) |input| {
        _ = matcher.match_any(input);
    }
}

fn benchMultipleMatchersConcurrency(allocator: std.mem.Allocator) void {
    const inputs = generateInputs(allocator, 1000);
    defer {
        for (inputs) |input| {
            allocator.free(input);
        }
        allocator.free(inputs);
    }

    const pattern_matrices = [_][]const []const u8{
        &[_][]const u8{"*"},
        &[_][]const u8{"eslint-*"},
        &[_][]const u8{"*plugin*"},
        &[_][]const u8{ "eslint-*", "!eslint-plugin-bar" },
        &[_][]const u8{ "!eslint-plugin-bar", "eslint-*" },
    };

    var matchers = allocator.alloc(pattern.PatternMatcher, pattern_matrices.len) catch @panic("Out of memory");
    defer allocator.free(matchers);

    for (pattern_matrices, 0..) |rules, i| {
        matchers[i] = pattern.PatternMatcher.init(allocator, rules) catch @panic("Failed to init matcher");
    }
    defer {
        for (matchers) |*matcher| {
            matcher.deinit();
        }
    }

    for (matchers) |matcher| {
        for (inputs) |input| {
            _ = matcher.match_any(input);
        }
    }
}

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    var bench = zbench.Benchmark.init(std.heap.page_allocator, .{});
    defer bench.deinit();

    try bench.add("Simple Pattern Matching", benchSimplePatternMatching, .{});
    try bench.add("Complex Pattern Matching", benchComplexPatternMatching, .{});
    try bench.add("Multiple Matchers Concurrency", benchMultipleMatchersConcurrency, .{});

    try stdout.writeAll("\n");
    try bench.run(stdout);
}

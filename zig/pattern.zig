const std = @import("std");
const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;

const Pattern = struct {
    allocator: Allocator,
    segments: [][]const u8,
    is_negative: bool,

    const Self = @This();

    pub fn init(allocator: Allocator, pattern: []const u8) !Self {
        if (std.mem.eql(u8, pattern, "*")) {
            return Self{
                .allocator = allocator,
                .segments = &[_][]const u8{},
                .is_negative = false,
            };
        }

        const is_negative = pattern[0] == '!';

        const actual_pattern = if (is_negative) pattern[1..] else pattern;
        var segments = ArrayList([]const u8).init(allocator);
        var iterator = std.mem.splitScalar(u8, actual_pattern, '*');

        while (iterator.next()) |iter| {
            try segments.append(try allocator.dupe(u8, iter));
        }

        return Self{
            .allocator = allocator,
            .segments = try segments.toOwnedSlice(),
            .is_negative = is_negative,
        };
    }

    pub fn deinit(self: *Self) void {
        for (self.segments) |segment| {
            self.allocator.free(segment);
        }
        self.allocator.free(self.segments);
    }

    inline fn match_segments(self: *const Self, input: []const u8) bool {
        return switch (self.segments.len) {
            0 => true,
            1 => std.mem.eql(u8, input, self.segments[0]),
            else => {
                var current_pos: usize = 0;
                if (self.segments[0].len > 0) {
                    if (!std.mem.startsWith(u8, input, self.segments[0])) {
                        return false;
                    }
                    current_pos = self.segments[0].len;
                }

                for (self.segments[1 .. self.segments.len - 1]) |segment| {
                    if (segment.len == 0) continue;

                    if (std.mem.indexOfPos(u8, input, current_pos, segment)) |idx| {
                        current_pos = idx + segment.len;
                    } else return false;
                }

                const last_segment = self.segments[self.segments.len - 1];
                return last_segment.len == 0 or std.mem.endsWith(u8, input, last_segment);
            },
        };
    }
};

pub const PatternMatcher = struct {
    allocator: Allocator,
    patterns: []Pattern,

    const Self = @This();

    pub fn init(allocator: Allocator, patterns: []const []const u8) !Self {
        var pattern_array = try allocator.alloc(Pattern, patterns.len);
        errdefer allocator.free(pattern_array);
        for (patterns, 0..) |pattern, i| {
            const duped_pattern = try allocator.dupe(u8, pattern);
            defer allocator.free(duped_pattern);
            pattern_array[i] = try Pattern.init(allocator, duped_pattern);
        }
        return Self{
            .allocator = allocator,
            .patterns = pattern_array,
        };
    }

    pub fn deinit(self: *Self) void {
        for (self.patterns) |*p| {
            p.deinit();
        }
        self.allocator.free(self.patterns);
    }

    pub fn match_any(self: *const Self, input: []const u8) bool {
        var matched_any = false;
        var last_negative_match = false;

        for (self.patterns) |pattern| {
            const matches = pattern.match_segments(input);

            if (pattern.is_negative) {
                if (matches) {
                    last_negative_match = true;
                }
            } else if (matches) {
                if (last_negative_match) {
                    last_negative_match = false;
                }
                matched_any = true;
            }
        }

        return matched_any and !last_negative_match;
    }
};

test "Workspace Pattern" {
    const PatternTestCase = struct {
        input: []const u8,
        expected: bool,
    };

    const PatternMatchMatrix = struct {
        match_rules: []const []const u8,
        test_cases: []const PatternTestCase,
    };

    const fixture_matrix = [_]PatternMatchMatrix{
        .{
            .match_rules = &[_][]const u8{"*"},
            .test_cases = &[_]PatternTestCase{
                .{ .input = "@eslint/plugin-foo", .expected = true },
                .{ .input = "express", .expected = true },
            },
        },
        .{
            .match_rules = &[_][]const u8{"eslint-*"},
            .test_cases = &[_]PatternTestCase{
                .{ .input = "eslint-plugin-foo", .expected = true },
                .{ .input = "@eslint/plugin-x", .expected = false },
            },
        },
        .{
            .match_rules = &[_][]const u8{"*plugin*"},
            .test_cases = &[_]PatternTestCase{
                .{ .input = "@eslint/plugin-foo", .expected = true },
                .{ .input = "express", .expected = false },
            },
        },
        .{
            .match_rules = &[_][]const u8{"a*c"},
            .test_cases = &[_]PatternTestCase{
                .{ .input = "abc", .expected = true },
            },
        },
        .{
            .match_rules = &[_][]const u8{"*-positive"},
            .test_cases = &[_]PatternTestCase{
                .{ .input = "is-positive", .expected = true },
            },
        },
        .{
            .match_rules = &[_][]const u8{ "foo", "bar" },
            .test_cases = &[_]PatternTestCase{
                .{ .input = "foo", .expected = true },
                .{ .input = "bar", .expected = true },
            },
        },
        .{
            .match_rules = &[_][]const u8{ "eslint-*", "!eslint-plugin-bar" },
            .test_cases = &[_]PatternTestCase{
                .{ .input = "eslint-plugin-foo", .expected = true },
                .{ .input = "eslint-plugin-bar", .expected = false },
            },
        },
        .{
            .match_rules = &[_][]const u8{ "!eslint-plugin-bar", "eslint-*" },
            .test_cases = &[_]PatternTestCase{
                .{ .input = "eslint-plugin-foo", .expected = true },
                .{ .input = "eslint-plugin-bar", .expected = true },
            },
        },
        .{
            .match_rules = &[_][]const u8{ "eslint-*", "!eslint-plugin-*", "eslint-plugin-bar" },
            .test_cases = &[_]PatternTestCase{
                .{ .input = "eslint-config-foo", .expected = true },
                .{ .input = "eslint-plugin-foo", .expected = false },
                .{ .input = "eslint-plugin-bar", .expected = true },
            },
        },
        .{
            .match_rules = &[_][]const u8{ "!fold-1", "fold-3" },
            .test_cases = &[_]PatternTestCase{
                .{ .input = "fold-2", .expected = false },
                .{ .input = "fold-1", .expected = false },
            },
        },
    };

    for (fixture_matrix) |fixture| {
        var matcher = try PatternMatcher.init(std.testing.allocator, fixture.match_rules);
        defer matcher.deinit();
        for (fixture.test_cases) |test_case| {
            try std.testing.expectEqual(test_case.expected, matcher.match_any(test_case.input));
        }
    }
}

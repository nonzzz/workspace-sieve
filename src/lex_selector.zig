const std = @import("std");
const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;

pub const LexSelectorOptions = struct {
    diff: ?[]const u8 = null,
    exclude: bool = false,
    exclude_self: bool = false,
    include_dependencies: bool = false,
    include_dependents: bool = false,
    name_pattern: ?[]const u8 = null,
    version_pattern: ?[]const u8 = null,
    follow_prod_deps_only: bool = false,
};

pub const LexSelector = struct {
    const Self = @This();
    options: LexSelectorOptions,
    sb: StringBuilder,
    allocator: Allocator,
    pub const ParseResult = struct {
        diff: ?[]const u8,
        exclude: bool,
        exclude_self: bool,
        include_dependencies: bool,
        include_dependents: bool,
        name_pattern: ?[]const u8,
        parent_dir: ?[]const u8,
    };

    pub fn init(allocator: Allocator, options: LexSelectorOptions) Self {
        return Self{
            .allocator = allocator,
            .options = options,
            .sb = StringBuilder.init(allocator),
        };
    }

    pub fn deinit(self: *Self) void {
        self.sb.deinit();
    }

    pub fn parse(self: *Self, raw_selector: []const u8, prefix: []const u8) !ParseResult {
        _ = prefix; // autofix
        const alt_slice: []u8 = &.{};
        _ = alt_slice; // autofix
        var exclude = false;
        if (raw_selector[0] == '!') {
            exclude = true;
            try self.sb.write(raw_selector[1..]);
        } else {
            try self.sb.write(raw_selector);
        }
        var exclude_self = false;
        const include_dependencies = std.mem.eql(u8, self.sb.s.items[self.sb.s.items.len - 3 ..], "...");
        if (include_dependencies) {
            for (0..2) |_| {
                _ = self.sb.s.pop();
            }
            if (self.sb.s.items[self.sb.s.items.len - 1] == '^') {
                exclude_self = true;
                _ = self.sb.s.pop();
            }
        }
        const include_dependents = std.mem.eql(u8, self.sb.s.items[0..3], "...");
        if (include_dependents) {
            for (0..2) |pos| {
                _ = self.sb.s.orderedRemove(pos);
            }
            if (self.sb.s.items[0] == '^') {
                exclude_self = true;
                _ = self.sb.s.orderedRemove(0);
            }
        }
        return .{
            .diff = null,
            .exclude = exclude,
            .exclude_self = exclude_self,
            .include_dependencies = include_dependencies,
            .include_dependents = include_dependents,
            .name_pattern = self.sb.s.items,
            .parent_dir = null,
        };
    }
};

const StringBuilder = struct {
    const Self = @This();
    s: ArrayList(u8),
    allocator: Allocator,
    pub fn init(allocator: Allocator) Self {
        return Self{
            .allocator = allocator,
            .s = ArrayList(u8).init(allocator),
        };
    }
    pub fn deinit(self: *Self) void {
        self.s.deinit();
    }

    pub fn write_str(self: *Self, str: []const u8) !void {
        for (str) |b| {
            try self.s.append(b);
        }
    }
    pub fn write_byte(self: *Self, byte: comptime_int) !void {
        try self.s.append(byte);
    }
    pub fn write(self: *Self, data: anytype) !void {
        const T = @TypeOf(data);
        switch (@typeInfo(T)) {
            .Int, .ComptimeInt => try self.write_byte(data),
            .Pointer => |ptr| switch (ptr.size) {
                .One, .Slice => try self.write_str(data),
                else => @compileError("Unsupported pointer type"),
            },
            else => @compileError("Unsupported type"),
        }
    }
};

fn compareStructs(a: LexSelector.ParseResult, b: LexSelector.ParseResult) bool {
    _ = b; // autofix
    _ = a; // autofix
    return true;
}

fn TestLexSelector(allocator: Allocator, input: []const u8, expect: LexSelector.ParseResult) !void {
    var selector = LexSelector.init(allocator, .{});
    defer selector.deinit();
    const act = try selector.parse(input, "");
    try std.testing.expect(compareStructs(act, expect));
}

test "LexSelector" {
    try TestLexSelector(std.testing.allocator, "foo", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = false,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "foo...", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = true,
        .include_dependents = false,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "...foo", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "...foo...", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = true,
        .include_dependents = true,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "foo^...", .{
        .diff = null,
        .exclude = false,
        .exclude_self = true,
        .include_dependencies = true,
        .include_dependents = false,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "...^foo", .{
        .diff = null,
        .exclude = false,
        .exclude_self = true,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "./foo", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "../foo", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, ".../{foo}", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "[master]", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "{foo}[master]", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "pattern{foo}[master]", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "[master]...", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "...[master]", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = "foo",
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "...[master]...", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = "foo",
        .parent_dir = null,
    });
}

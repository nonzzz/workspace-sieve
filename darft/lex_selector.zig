const std = @import("std");
const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;
const path = std.fs.path;

const LexError = error{
    InvalidCurlyBrace,
    UnexpectChar,
    OutOfBound,
};

// pub const LexSelectorOptions = struct {
//     diff: ?[]const u8 = null,
//     exclude: bool = false,
//     exclude_self: bool = false,
//     include_dependencies: bool = false,
//     include_dependents: bool = false,
//     name_pattern: ?[]const u8 = null,
//     version_pattern: ?[]const u8 = null,
//     follow_prod_deps_only: bool = false,
// };

pub const LexSelector = struct {
    const Self = @This();
    sb: StringBuilder,
    allocator: Allocator,
    matched: MatchResult = .{},
    pub const ParseResult = struct {
        diff: ?[]const u8,
        exclude: ?bool,
        exclude_self: ?bool,
        include_dependencies: ?bool,
        include_dependents: ?bool,
        name_pattern: ?[]const u8,
        parent_dir: ?[]const u8,
    };

    const MatchResult = struct {
        name: ?[]const u8 = null,
        curly: ?[]const u8 = null,
        square: ?[]const u8 = null,
    };

    pub fn init(allocator: Allocator) Self {
        return Self{
            .allocator = allocator,
            .sb = StringBuilder.init(allocator),
        };
    }

    pub fn deinit(self: *Self) void {
        self.sb.deinit();
        defer {
            if (self.matched.name) |name| {
                self.allocator.free(name);
            }
            if (self.matched.square) |square| {
                self.allocator.free(square);
            }
            if (self.matched.curly) |curly| {
                self.allocator.free(curly);
            }
        }
    }

    pub fn parse(self: *Self, raw_selector: []const u8, prefix: []const u8) !ParseResult {
        var exclude = false;
        if (raw_selector[0] == '!') {
            exclude = true;
            try self.sb.write(raw_selector[1..]);
        } else {
            try self.sb.write(raw_selector);
        }
        var exclude_self = false;

        const include_dependencies = if (self.sb.s.items.len >= 3) std.mem.endsWith(u8, self.sb.s.items, "...") else false;
        if (include_dependencies) {
            for (0..3) |_| {
                _ = self.sb.s.pop();
            }
            if (self.sb.s.items[self.sb.s.items.len - 1] == '^') {
                exclude_self = true;
                _ = self.sb.s.pop();
            }
        }
        const include_dependents = if (self.sb.s.items.len >= 3) std.mem.eql(u8, self.sb.s.items[0..3], "...") else false;
        if (include_dependents) {
            for (0..3) |_| {
                _ = self.sb.s.orderedRemove(0);
            }
            if (self.sb.s.items[0] == '^') {
                exclude_self = true;
                _ = self.sb.s.orderedRemove(0);
            }
        }
        self.matched = self.symbol_match() catch {
            if (self.is_selector_by_loc()) {
                self.matched.name = try path.join(self.allocator, &[_][]const u8{
                    prefix,
                    self.sb.s.items,
                });
                return .{
                    .diff = null,
                    .exclude = exclude,
                    .exclude_self = false,
                    .include_dependencies = null,
                    .include_dependents = null,
                    .name_pattern = null,
                    .parent_dir = self.matched.name,
                };
            }
            return .{
                .diff = null,
                .exclude = exclude,
                .exclude_self = null,
                .include_dependencies = null,
                .include_dependents = null,
                .parent_dir = null,
                .name_pattern = self.sb.s.items,
            };
        };
        return .{
            .diff = if (self.matched.square) |square| if (square.len > 2) square[1 .. square.len - 1] else null else null,
            .exclude = exclude,
            .exclude_self = exclude_self,
            .include_dependencies = include_dependencies,
            .include_dependents = include_dependents,
            .name_pattern = self.matched.name,
            .parent_dir = if (self.matched.curly) |curly| if (curly.len > 2) curly[1 .. curly.len - 1] else null else null,
        };
    }

    /// ^([^.][^{}[\]]*)?(\{[^}]+\})?(\[[^\]]+\])?$/)
    /// I don't want to link perl.
    /// I hope zig implement a offical reg exp engine :-(
    fn symbol_match(self: *Self) !MatchResult {
        var result = MatchResult{};
        var index: usize = 0;
        const str = self.sb.s.items;
        if (str.len <= 1) {
            return error.OutOfBound;
        }
        if (str[index] == '.') {
            return error.UnexpectChar;
        }

        if (index < str.len) {
            const start = index;
            while (index < str.len) {
                const c = str[index];
                if (c == '{' or c == '[' or c == ']' or c == '}') break;
                index += 1;
            }
            const end = index;
            if (start != index) {
                result.name = try self.allocator.dupe(u8, str[start..end]);
            }
        }

        if (index < str.len and str[index] == '{') {
            const start = index;
            while (index < str.len and str[index] != '}') {
                index += 1;
            }
            if (index < str.len and str[index] == '}') {
                const end = if (index == str.len) index else index + 1;
                result.curly = try self.allocator.dupe(u8, str[start..end]);
                index += 1;
            } else {
                return error.InvalidCurlyBrace;
            }
        }

        if (index < str.len and str[index] == '[') {
            const start = index;
            while (index < str.len and str[index] != ']') {
                index += 1;
            }
            if (index < str.len and str[index] == ']') {
                const end = if (index == str.len) index else index + 1;
                result.square = try self.allocator.dupe(u8, str[start..end]);
                index += 1;
            } else {
                return error.InvalidSquareBracket;
            }
        }

        if (result.name == null and result.curly == null and result.square == null) {
            return error.UnexpectChar;
        }

        return result;
    }
    inline fn is_selector_by_loc(self: *Self) bool {
        const str = self.sb.s.items;
        if (str.len <= 3) return false;
        if (str[0] != '.') return false;
        if (str.len == 1 or str[1] == '/' or str[1] == '\\') return true;
        if (str[1] != '.') return false;
        return str.len == 2 or str[2] == '/' or str[2] == '\\';
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

fn compareStructs(comptime T: type, a: T, b: T) bool {
    switch (@typeInfo(T)) {
        .Struct => |struct_info| {
            inline for (struct_info.fields) |field| {
                const a_value = @field(a, field.name);
                const b_value = @field(b, field.name);
                const filed_type_info = @typeInfo(field.type);
                if (@TypeOf(a_value) == @TypeOf(undefined)) {
                    continue;
                }
                switch (filed_type_info) {
                    .Optional => |optional_info| {
                        const a_is_null = a_value == null;
                        const b_is_null = b_value == null;
                        if (a_is_null != b_is_null) return false;
                        if (!a_is_null) {
                            switch (@typeInfo(optional_info.child)) {
                                .Pointer => |ptr_info| {
                                    if (ptr_info.child == u8) {
                                        if (!std.mem.eql(u8, a_value.?, b_value.?)) {
                                            return false;
                                        }
                                    }
                                },
                                .Bool => {
                                    if (a_value.? != b_value.?) {
                                        return false;
                                    }
                                },
                                else => {
                                    if (a_value.? != b_value.?) {
                                        return false;
                                    }
                                },
                            }
                        }
                    },
                    else => continue,
                }
            }
            return true;
        },
        else => {
            return false;
        },
    }
}

fn TestLexSelector(allocator: Allocator, input: []const u8, expect: LexSelector.ParseResult) !void {
    var selector = LexSelector.init(allocator);
    defer selector.deinit();
    const act = try selector.parse(input, "");
    try std.testing.expect(compareStructs(LexSelector.ParseResult, act, expect));
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
        .include_dependencies = null,
        .include_dependents = null,
        .name_pattern = null,
        .parent_dir = "./foo",
    });

    try TestLexSelector(std.testing.allocator, "../foo", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = null,
        .include_dependents = null,
        .name_pattern = null,
        .parent_dir = "../foo",
    });

    try TestLexSelector(std.testing.allocator, "...{./foo}", .{
        .diff = null,
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = null,
        .parent_dir = "./foo",
    });

    try TestLexSelector(std.testing.allocator, "[master]", .{
        .diff = "master",
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = false,
        .name_pattern = null,
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "{foo}[master]", .{
        .diff = "master",
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = false,
        .name_pattern = null,
        .parent_dir = "foo",
    });

    try TestLexSelector(std.testing.allocator, "pattern{foo}[master]", .{
        .diff = "master",
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = false,
        .name_pattern = "pattern",
        .parent_dir = "foo",
    });

    try TestLexSelector(std.testing.allocator, "[master]...", .{
        .diff = "master",
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = true,
        .include_dependents = false,
        .name_pattern = null,
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "...[master]", .{
        .diff = "master",
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = false,
        .include_dependents = true,
        .name_pattern = null,
        .parent_dir = null,
    });

    try TestLexSelector(std.testing.allocator, "...[master]...", .{
        .diff = "master",
        .exclude = false,
        .exclude_self = false,
        .include_dependencies = true,
        .include_dependents = true,
        .name_pattern = null,
        .parent_dir = null,
    });
}

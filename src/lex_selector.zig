const std = @import("std");

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
    pub fn init(options: LexSelectorOptions) Self {
        return Self{
            .options = options,
        };
    }

    pub fn parse(raw_selector: []const u8, prefix: []const u8) void {
        _ = raw_selector; // autofix
        _ = prefix; // autofix
        const alt_slice: []u8 = &.{};
        _ = alt_slice; // autofix
    }
};

test "LexSelector" {}

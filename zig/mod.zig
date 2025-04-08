const std = @import("std");
const pattern = @import("./pattern.zig");

const Allocator = std.mem.Allocator;

extern "env" fn logString(ptr: [*]const u8, len: usize) void;
extern "env" fn logBytes(ptr: [*]const u8, len: usize) void;
extern "env" fn isDebugEnabled() bool;

fn is_debug_mode() bool {
    return isDebugEnabled();
}

fn debug_print(allocator: Allocator, comptime fmt: []const u8, args: anytype) void {
    if (!is_debug_mode()) return;
    const debug_text = std.fmt.allocPrint(allocator, fmt, args) catch return;
    defer allocator.free(debug_text);
    logString(debug_text.ptr, debug_text.len);
}

fn debug_bytes(bytes: []const u8) void {
    if (!is_debug_mode()) return;
    logBytes(bytes.ptr, bytes.len);
}

pub const MatcherContext = struct {
    allocator: Allocator,
    instances: std.AutoHashMap(usize, *pattern.PatternMatcher),
    next_id: usize,

    const Self = @This();

    pub fn init(allocator: Allocator) Self {
        return Self{
            .allocator = allocator,
            .instances = std.AutoHashMap(usize, *pattern.PatternMatcher).init(allocator),
            .next_id = 1,
        };
    }

    pub fn deinit(self: *Self) void {
        var it = self.instances.iterator();
        while (it.next()) |entry| {
            var matcher = entry.value_ptr.*;
            matcher.deinit();
            self.allocator.destroy(matcher);
        }
        self.instances.deinit();
    }

    pub fn createMatcher(self: *Self, patterns: []const []const u8) !u32 {
        const matcher = try self.allocator.create(pattern.PatternMatcher);
        matcher.* = try pattern.PatternMatcher.init(self.allocator, patterns);
        const id = self.next_id;
        self.next_id += 1;
        try self.instances.put(id, matcher);
        return @as(u32, id);
    }

    pub fn match(self: *Self, id: u32, input: []const u8) bool {
        if (self.instances.get(id)) |matcher| {
            return matcher.match_any(input);
        }
        return false;
    }

    pub fn disposeMatcher(self: *Self, id: u32) void {
        if (self.instances.getPtr(id)) |matcher_ptr| {
            var matcher = matcher_ptr.*;
            matcher.deinit();
            self.allocator.destroy(matcher);
            _ = self.instances.remove(id);
        }
    }
};

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
var global_allocator = gpa.allocator();

export fn createMatcherContext() usize {
    const context = global_allocator.create(MatcherContext) catch unreachable;
    context.* = MatcherContext.init(global_allocator);
    debug_print(global_allocator, "Context created at address: {d}", .{@intFromPtr(context)});
    return @intFromPtr(context);
}

export fn destroyMatcherContext(context_ptr: usize) void {
    var context = @as(*MatcherContext, @ptrFromInt(context_ptr));
    context.deinit();
    global_allocator.destroy(context);
}

export fn initMatcher(
    context_ptr: usize,
    patterns_ptr: [*]const u8,
    lengths_ptr: [*]const u32,
    count: usize,
) u32 {
    var context = @as(*MatcherContext, @ptrFromInt(context_ptr));
    var patterns_list = std.ArrayList([]const u8).init(global_allocator);
    defer patterns_list.deinit();

    const lengths = lengths_ptr[0..count];

    var offset: usize = 0;
    var i: usize = 0;
    while (i < count) : (i += 1) {
        const len = lengths[i];
        const pattern_slice = patterns_ptr[offset .. offset + len];

        debug_print(global_allocator, "Pattern {d} bytes:", .{i});
        debug_bytes(pattern_slice);
        debug_print(global_allocator, "Pattern {d}: '{s}' (len={d})", .{ i, pattern_slice, len });

        patterns_list.append(global_allocator.dupe(u8, pattern_slice) catch unreachable) catch unreachable;
        offset += len + 1; // +1 for null terminator
    }

    return context.createMatcher(patterns_list.items) catch unreachable;
}

export fn matchPattern(context_ptr: usize, matcher_id: u32, input_ptr: [*]const u8, input_len: usize) bool {
    var context = @as(*MatcherContext, @ptrFromInt(context_ptr));
    const input = input_ptr[0..input_len];
    debug_print(global_allocator, "Matching input: '{s}' (len={d})", .{ input, input_len });
    const result = context.match(matcher_id, input);
    debug_print(global_allocator, "Match result: {}", .{result});
    return result;
}

export fn disposeMatcher(context_ptr: usize, matcher_id: u32) void {
    var context = @as(*MatcherContext, @ptrFromInt(context_ptr));
    context.disposeMatcher(matcher_id);
}

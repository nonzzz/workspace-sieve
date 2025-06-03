const std = @import("std");
const Pattern = @import("./pattern.zig");

var gpa = std.heap.wasm_allocator;

extern "env" fn js_log(addr: [*]const u8, len: usize) void;

fn log(message: []const u8) void {
    js_log(message.ptr, message.len);
}

export fn create_pattern_matcher(ptr: [*]const u8, len: u32) ?*Pattern.PatternMatcher {
    var patterns = std.ArrayList([]const u8).init(gpa);
    defer patterns.deinit();

    const data_slice = if (len > 0 and ptr[len - 1] == 0) ptr[0 .. len - 1] else ptr[0..len];

    if (data_slice.len >= 1) {
        var iterator = std.mem.splitScalar(u8, data_slice, 0);

        patterns.append(iterator.first()) catch return null;

        while (iterator.next()) |pattern| {
            if (pattern.len > 0) {
                patterns.append(pattern) catch return null;
            }
        }
    }

    const matcher = gpa.create(Pattern.PatternMatcher) catch return null;
    matcher.* = Pattern.PatternMatcher.init(gpa, patterns.items) catch {
        gpa.destroy(matcher);
        return null;
    };

    return matcher;
}

export fn destroy_pattern_matcher(matcher_ptr: ?*Pattern.PatternMatcher) void {
    if (matcher_ptr) |matcher| {
        matcher.deinit();
        gpa.destroy(matcher);
    }
}

export fn pattern_match(matcher_ptr: ?*Pattern.PatternMatcher, input_ptr: [*]const u8, input_len: u32) bool {
    if (matcher_ptr) |matcher| {
        const input = input_ptr[0..input_len];
        return matcher.match_any(input);
    }
    return false;
}

export fn allocate_memory(size: u32) ?[*]u8 {
    const slice = gpa.alloc(u8, size) catch return null;
    return slice.ptr;
}

export fn free_memory(ptr: [*]u8, size: u32) void {
    const slice = ptr[0..size];
    gpa.free(slice);
}

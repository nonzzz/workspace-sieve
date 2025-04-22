const std = @import("std");
const pattern = @import("./pattern.zig");
const logger = @import("./logger.zig");
const mem = std.mem;
const unicode = std.unicode;

extern "env" fn _print_js_str(addr: [*]const u8, len: usize) void;

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
var global_allocator = gpa.allocator();

var global_logger: logger.Logger = undefined;

export fn initLogger() void {
    global_logger = logger.Logger.init(global_allocator, _print_js_str);
}

export fn patternMatch(
    patterns_ptr: [*]const u16,
    patterns_len_ptr: [*]const u32,
    patterns_count: usize,
    input_ptr: [*]const u16,
    input_len: usize,
) bool {
    var utf8_patterns = std.ArrayList([]const u8).init(global_allocator);
    defer {
        for (utf8_patterns.items) |utf8_pat| {
            global_allocator.free(utf8_pat);
        }
        utf8_patterns.deinit();
    }

    var offset: usize = 0;
    var i: usize = 0;
    while (i < patterns_count) : (i += 1) {
        const len = patterns_len_ptr[i];
        const pattern_slice = patterns_ptr[offset .. offset + len];

        const actual_len = if (len > 0 and pattern_slice[len - 1] == 0) len - 1 else len;
        const clean_pattern_slice = pattern_slice[0..actual_len];

        const utf8_pattern = unicode.wtf16LeToWtf8Alloc(global_allocator, clean_pattern_slice) catch |err| {
            global_logger.err("Failed to convert pattern to UTF-8: {}", .{err});
            return false;
        };

        global_logger.debug("Pattern {d}: '{s}'{s} (len={d})", .{
            i,
            if (utf8_pattern.len > 20) utf8_pattern[0..20] else utf8_pattern,
            if (utf8_pattern.len > 20) "..." else "",
            utf8_pattern.len,
        });

        utf8_patterns.append(utf8_pattern) catch |err| {
            global_logger.err("Failed to append pattern: {}", .{err});
            return false;
        };

        offset += len + 1;
        offset = (offset + 1) & ~@as(usize, 1);
    }

    const input_slice = input_ptr[0..input_len];
    const actual_input_len = if (input_len > 0 and input_slice[input_len - 1] == 0) input_len - 1 else input_len;
    const clean_input_slice = input_slice[0..actual_input_len];
    const utf8_input = unicode.wtf16LeToWtf8Alloc(global_allocator, clean_input_slice) catch |err| {
        global_logger.err("Failed to convert input to UTF-8: {}", .{err});
        return false;
    };
    defer global_allocator.free(utf8_input);

    global_logger.debug("Input preview: '{s}'{s}", .{ if (utf8_input.len > 60) utf8_input[0..60] else utf8_input, if (utf8_input.len > 60) "..." else "" });

    var matcher = pattern.PatternMatcher.init(global_allocator, utf8_patterns.items) catch |err| {
        global_logger.err("Failed to initialize matcher: {}", .{err});
        return false;
    };
    defer matcher.deinit();

    const result = matcher.match_any(utf8_input);

    if (result) {
        global_logger.info("Pattern matched!", .{});
    } else {
        global_logger.info("No patterns matched", .{});
    }

    return result;
}

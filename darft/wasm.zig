const std = @import("std");
const lex_selector = @import("./mod.zig").lex_selector;

const wasm_alloc = std.heap.wasm_allocator;

const ParsePkgSelectorOptions = struct {
    input: []const u8,
    prefix: []const u8,
};

export fn parse_pkg_selector(input_ptr: [*]u8, input_len: usize) i32 {
    const input = input_ptr[0..input_len];
    const parse_options = std.json.parseFromSlice(
        ParsePkgSelectorOptions,
        wasm_alloc,
        input,
        .{},
    ) catch return -2;
    defer parse_options.deinit();
    var lex = lex_selector.LexSelector.init(wasm_alloc);
    defer lex.deinit();
    const lex_result = lex.parse(
        parse_options.value.input,
        parse_options.value.prefix,
    ) catch return -1;
    const str = std.json.stringifyAlloc(wasm_alloc, lex_result, .{}) catch return -3;
    std.mem.copyBackwards(u8, input_ptr[0..str.len], str);
    return @as(i32, @intCast(str.len));
}

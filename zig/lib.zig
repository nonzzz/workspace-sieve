const std = @import("std");
const root = @import("root");

extern "wasmapi" fn _panic(addr: [*]const u8, len: usize) noreturn;

pub fn panic(msg: []const u8, _: ?*std.builtin.StackTrace, _: ?usize) noreturn {
    _panic(msg.ptr, msg.len);
    unreachable;
}

pub inline fn allocator() ?std.mem.Allocator {
    return if (@hasDecl(root, "WASM_ALLOCATOR")) root.WASM_ALLOCATOR else null;
}

pub export fn _wasm_allocate(numBytes: usize) usize {
    if (allocator()) |alloc| {
        const mem = alloc.alignedAlloc(u8, 16, numBytes) catch return 0;
        return @intFromPtr(mem.ptr);
    }
    return 0;
}

pub export fn _wasm_free(addr: [*]u8, numBytes: usize) void {
    if (allocator()) |alloc| {
        var mem = [2]usize{ @intFromPtr(addr), numBytes };
        alloc.free(@as(*[]u8, @ptrCast(&mem)).*);
    }
}

extern "wasmapi" fn _print_u8_array(addr: [*]const u8, len: usize) void;

pub fn print_u8_array(buf: []const u8) void {
    print_u8_array(buf.ptr, buf.len);
}

extern "wasmapi" fn _print_js_str(addr: [*]const u8, len: usize) void;

pub fn print_js_str(str: []const u8) void {
    _print_js_str(str.ptr, str.len);
}

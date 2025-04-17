const std = @import("std");

pub const LogLevel = enum(u3) {
    debug = 0,
    info = 1,
    warn = 2,
    err = 3,
};

pub const LogMessage = struct {
    level: LogLevel,
    message: []const u8,
    pub fn format(self: LogMessage, allocator: std.mem.Allocator) ![]const u8 {
        return try std.fmt.allocPrint(allocator, "{d}|{s}", .{ @intFromEnum(self.level), self.message });
    }
};

pub const Logger = struct {
    allocator: std.mem.Allocator,
    print_fn: *const fn (ptr: [*]const u8, len: usize) callconv(.C) void,

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator, comptime print_fn: *const fn (ptr: [*]const u8, len: usize) callconv(.C) void) Logger {
        return Self{
            .allocator = allocator,
            .print_fn = print_fn,
        };
    }

    fn log(self: *Self, level: LogLevel, comptime fmt: []const u8, args: anytype) void {
        const message = std.fmt.allocPrint(self.allocator, fmt, args) catch return;
        defer self.allocator.free(message);

        const log_message = LogMessage{
            .level = level,
            .message = message,
        };

        const formatted = log_message.format(self.allocator) catch return;
        defer self.allocator.free(formatted);

        self.print_fn(formatted.ptr, formatted.len);
    }

    pub fn debug(self: *Self, comptime fmt: []const u8, args: anytype) void {
        self.log(.debug, fmt, args);
    }

    pub fn info(self: *Self, comptime fmt: []const u8, args: anytype) void {
        self.log(.info, fmt, args);
    }

    pub fn warn(self: *Self, comptime fmt: []const u8, args: anytype) void {
        self.log(.warn, fmt, args);
    }

    pub fn err(self: *Self, comptime fmt: []const u8, args: anytype) void {
        self.log(.err, fmt, args);
    }
};

#ifndef LOGGER_H
#define LOGGER_H

#include <Arduino.h>
#include "config.h"

enum class LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARNING = 2,
    ERROR = 3
};

class Logger {
public:
    static void log(LogLevel level, const String& message) {
        if (static_cast<int>(level) < LOG_LEVEL) return;
        
        String prefix;
        switch(level) {
            case LogLevel::DEBUG:   prefix = "🔍 [DEBUG] "; break;
            case LogLevel::INFO:    prefix = "ℹ️ [INFO] "; break;
            case LogLevel::WARNING: prefix = "⚠️ [WARN] "; break;
            case LogLevel::ERROR:   prefix = "❌ [ERROR] "; break;
        }
        
        Serial.println(prefix + message);
    }

    static void debug(const String& message) {
        log(LogLevel::DEBUG, message);
    }

    static void info(const String& message) {
        log(LogLevel::INFO, message);
    }

    static void warning(const String& message) {
        log(LogLevel::WARNING, message);
    }

    static void error(const String& message) {
        log(LogLevel::ERROR, message);
    }
};

#endif // LOGGER_H 
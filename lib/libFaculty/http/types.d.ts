/**
 * Copyright 2022 HolyCorn Software
 * The Soul System
 * This module contains type definitions for faculty-specific http features
 */

interface FacultyDescriptorHTTPOptions {
    staticPaths: {
        [urlPath: string]: string
    }
}
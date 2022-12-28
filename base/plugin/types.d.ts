/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module (types) contains type definitions for the plugin module of the base platform
 */

import { PluginStatus } from "system/lib/libFaculty/plugin/types"

type PluginSupportMap = { [faculty: string]: boolean }

type FacultiesPlugins = { [faculty: string]: PluginStatus[] }
/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module contains type definitions for the file-manager module of the frontend-manager component.
 * 
 */


import ''

global {
    namespace base.rpc {
        interface BaseToFacultyEvents {
            'frontend-manager-files-ready': undefined
            'frontend-manager-files-change': undefined
        }
    }

    namespace soul.http.frontendManager.fileManager {
        type FileManagerEvents = {
            addEventListener: (event: 'config-change' | 'files-change', cb: (event: Event) => void, opts?: AddEventListenerOptions) => void
        } & EventTarget
    }
}
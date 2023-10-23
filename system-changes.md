.

Added server-version feature, to base platform, and service-worker, to ensure other components, 

Improved json-rpc cache by:
1. Adding ability to **tag** an item to be saved in cache, for more precise removal.
2. Added server-version feature, which helps improve the accuracy of the cache, by erasing the cache, when the server version is ahead of what we know.
3. Improve interoperability of the MetaObject.


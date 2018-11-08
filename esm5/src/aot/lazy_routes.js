/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tokenReference } from '../compile_metadata';
export function listLazyRoutes(moduleMeta, reflector) {
    var allLazyRoutes = [];
    for (var _i = 0, _a = moduleMeta.transitiveModule.providers; _i < _a.length; _i++) {
        var _b = _a[_i], provider = _b.provider, module = _b.module;
        if (tokenReference(provider.token) === reflector.ROUTES) {
            var loadChildren = _collectLoadChildren(provider.useValue);
            for (var _c = 0, loadChildren_1 = loadChildren; _c < loadChildren_1.length; _c++) {
                var route = loadChildren_1[_c];
                allLazyRoutes.push(parseLazyRoute(route, reflector, module.reference));
            }
        }
    }
    return allLazyRoutes;
}
function _collectLoadChildren(routes, target) {
    if (target === void 0) { target = []; }
    if (typeof routes === 'string') {
        target.push(routes);
    }
    else if (Array.isArray(routes)) {
        for (var _i = 0, routes_1 = routes; _i < routes_1.length; _i++) {
            var route = routes_1[_i];
            _collectLoadChildren(route, target);
        }
    }
    else if (routes.loadChildren) {
        _collectLoadChildren(routes.loadChildren, target);
    }
    else if (routes.children) {
        _collectLoadChildren(routes.children, target);
    }
    return target;
}
export function parseLazyRoute(route, reflector, module) {
    var _a = route.split('#'), routePath = _a[0], routeName = _a[1];
    var referencedModule = reflector.resolveExternalReference({
        moduleName: routePath,
        name: routeName,
    }, module ? module.filePath : undefined);
    return { route: route, module: module || referencedModule, referencedModule: referencedModule };
}
//# sourceMappingURL=lazy_routes.js.map
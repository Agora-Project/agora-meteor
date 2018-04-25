/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

Package.describe({
    name: 'agoraforum:core',
    version: '0.1.3',
    summary: 'Graph-based forum',
    git: 'https://github.com/Agora-Project/agora-meteor',
    documentation: 'README.md'
});

Npm.depends({
  step: '1.0.0',
  xml2js: '0.4.19'
});

Package.onUse(function(api) {
    both = ['client', 'server'];

    api.addFiles([
        'server/initial-data.js',
        'server/methods.js',
        'server/publish.js',
        'server/users.js',
        'lib/webfinger/lib/webfinger.js'
    ], 'server');

    api.addFiles([
        'lib/identity_collections/identity_collections.js',
        'lib/grapher/layered_grapher.js',
        'lib/schemas/post.js',
        'lib/schemas/report.js',
        'lib/schemas/tag.js',
        'lib/schemas/vote.js',
        'routes.js'
    ], both);

    api.use([
        'ecmascript',
        'iron:router',
	    'matb33:collection-hooks',
        'aldeed:simple-schema',
        'aldeed:collection2',
        'accounts-base',
        'alanning:roles',
        'email'
    ], both);

    api.addFiles([
        'client/lib/XBBCode/xbbcode.js',
        'client/lib/XBBCode/xbbcode.css',
        'client/lib/notifier.js',
        'client/lib/requestAnimationFrame.js',
        'client/lib/templateParents.js',
        'client/lib/seenPosts.js',
        'client/subscriptionManager.js'
    ], 'client');

    api.addFiles([
        'client/main.html',
        'client/main.css',
        'client/init.js'
    ], 'client');

    api.addFiles([
        'client/userList/userList.html',
        'client/userList/userList.js'
    ], 'client');

    api.addFiles([
        'client/errorPage/errorPage.html'
    ], 'client');

    api.addFiles([
        'client/mainView/detailed/detailed.html',
        'client/mainView/detailed/detailed.css',
        'client/mainView/detailed/detailed.js',
        'client/mainView/reply/reply.html',
        'client/mainView/reply/reply.css',
        'client/mainView/reply/reply.js',
        'client/mainView/report/report.html',
        'client/mainView/report/report.css',
        'client/mainView/report/report.js',
        'client/mainView/main.html',
        'client/mainView/main.css',
        'client/mainView/layout.js',
        'client/mainView/partitioner.js',
        'client/mainView/camera.js',
        'client/mainView/renderer.js',
        'client/mainView/main.js'
    ], 'client');

    api.addFiles([
        'client/userProfile/userProfile.html',
        'client/userProfile/userProfile.css',
        'client/userProfile/userProfile.js'
    ], 'client');

    api.addFiles([
        'client/adminScreen/adminScreen.html',
        'client/adminScreen/adminScreen.css',
        'client/adminScreen/adminScreen.js'
    ], 'client');

    api.addAssets([
        'public/agoraforum.png'
    ], 'client');

    api.use([
        'ui',
        'session',
        'templating',
        'reactive-var',
        'utilities:avatar',
        'gwendall:body-events',
        'meteorhacks:subs-manager'
    ], 'client');
});

Package.onTest(function(api) {
    api.use('tinytest');
    api.use('agoraforum:core', ['client', 'server']);
});

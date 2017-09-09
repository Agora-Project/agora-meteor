/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Package.describe({
    name: 'agoraforum:core',
    version: '0.1.2',
    summary: 'Graph-based forum',
    git: 'https://github.com/Agora-Project/agora-meteor',
    documentation: 'README.md'
});

Package.onUse(function(api) {
    both = ['client', 'server'];

    api.versionsFrom('1.1.0.3');

    api.addFiles([
        'server/initial-data.js',
        'server/periodicLayout.js',
        'server/methods.js',
        'server/publish.js',
        'server/users.js'
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
        'ecmascript@0.6.0',
        'iron:router@1.0.0',
	'matb33:collection-hooks@0.7.13',
	'aldeed:simple-schema@1.5.3',
        'aldeed:collection2@2.3.3',
        'matb33:collection-hooks@0.7.13',
        'accounts-base',
        'alanning:roles@1.2.13',
        'email'
    ], both);

    api.addFiles([
        'client/lib/XBBCode/xbbcode.js',
        'client/lib/XBBCode/xbbcode.css',
        'client/lib/notifier.js',
        'client/lib/requestAnimationFrame.js',
        'client/lib/templateParents.js',
        'client/lib/seenPosts.js'
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
        'session',
        'templating',
        'reactive-var',
        'ui',
        'zodiase:mdl@1.0.2',
        'utilities:avatar@0.9.2',
        'gwendall:body-events@0.1.6'
    ], 'client');
});

Package.onTest(function(api) {
    api.use('tinytest');
    api.use('agoraforum:core', ['client', 'server']);
});

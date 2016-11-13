Router.onBeforeAction(function() {
    if (Meteor.user() && Meteor.user().isBanned) {
        return this.render('forbidden');
    } else {
        return this.next();
    }
});

Router.route('/forum', {
    name: 'forumIndex',
    template: 'forumIndex'
});

Router.route('/forum/post', {
    name: 'forumPost',
    template: 'forumPost'
});

Router.route('/forum/users', {
    name: 'forumUsers',
    template: 'forumUsers'
});

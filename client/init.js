/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Meteor.subscribe('users');
Meteor.subscribe('myself');
Meteor.subscribe('reports');

Accounts.onLogin(function () {
    let user = Meteor.user();
    if (user.isBanned) {
        //Log out user if banned.
        Meteor.users.update({_id: user._id}, {$set : {"services.resume.loginTokens" : []}});
    }
});

Avatar.setOptions({
    fallbackType: "initials",
    customImageProperty: function() {
        var user = this;
        // calculate the image URL here
        if (user.avatar)
            return user.avatar;
    }
});

/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Meteor.subscribe('users');
Meteor.subscribe('myself');
Meteor.subscribe('reports');

Accounts.onLogin(function () {
    user = Meteor.user(); //TODO: Axe this global.
    if(user.isBanned) {
        //Logout on login
        Meteor.users.update({_id: user._id}, {$set : { "services.resume.loginTokens" : [] }});
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

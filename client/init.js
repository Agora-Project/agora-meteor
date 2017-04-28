/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Meteor.subscribe('users');
Meteor.subscribe('myself');
Meteor.subscribe('reports');

Avatar.setOptions({
    fallbackType: "initials",
    customImageProperty: function() {
        var user = this;
        // calculate the image URL here
        if (user.avatar)
            return user.avatar;
    }
});

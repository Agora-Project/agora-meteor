/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

Meteor.subscribe('myself');

Avatar.setOptions({
    fallbackType: "initials",
    emailHashProperty: "profile.email_hash",
    customImageProperty: function() {
        var user = this;
        // calculate the image URL here
        if (user.avatar) {
            return user.avatar;
        }
    }
});

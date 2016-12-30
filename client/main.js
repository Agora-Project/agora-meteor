/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Avatar.setOptions({
    fallbackType: "initials",
    customImageProperty: function() {
        var user = this;
        // calculate the image URL here
        return user.avatar;
    }
});

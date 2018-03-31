/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

Template.prototype.getParents = function() {
    this.onCreated(function() {
        let parentView = this.view.parentView;
        while (parentView.templateInstance === undefined) {
            parentView = parentView.parentView;
        }
        this.parent = parentView.templateInstance();
    });
};

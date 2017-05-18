Template.prototype.getParents = function() {
    this.onCreated(function() {
        let parentView = this.view.parentView;
        while (parentView.templateInstance === undefined) {
            parentView = parentView.parentView;
        }
        this.parent = parentView.templateInstance();
    });
};

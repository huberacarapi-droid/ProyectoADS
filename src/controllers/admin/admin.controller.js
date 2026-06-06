const adminCtrl = {};

adminCtrl.rendexIndex = function(req, res) {
    res.render('admin/index.hbs', { layout: "admin.layout.hbs" });
};

export default adminCtrl;
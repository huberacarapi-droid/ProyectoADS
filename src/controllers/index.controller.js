const indexCtrl = {};

indexCtrl.renderIndex = function(req, res) {
    res.render('index.hbs', { layout: 'index.layout.hbs' });
};

indexCtrl.renderMarcoTeorico = function(req, res) {
    res.render('index/marco-teorico.hbs', { layout: 'index.layout.hbs' });
};

indexCtrl.renderAnalisisEstructurado = function(req, res) {
    res.render('index/analisis-estructurado.hbs', { layout: 'index.layout.hbs' });
}
indexCtrl.renderModeloAmbiental = function(req, res) {
    res.render('index/modelo-ambiental.hbs', { layout: 'index.layout.hbs' });
};
indexCtrl.renderModeloComportamiento = function(req, res) {
    res.render('index/modelo-comportamiento.hbs', { layout: 'index.layout.hbs' });
};

indexCtrl.renderOrientadoObjetos = function(req, res) {
    res.render('index/orientado-objetos.hbs', { layout: 'index.layout.hbs' });
}

indexCtrl.renderUML = function(req, res) {
    res.render('index/uml.hbs', { layout: 'index.layout.hbs' });
};

indexCtrl.renderVideos = function(req, res) {
    res.render('index/videos.hbs', { layout: 'index.layout.hbs' });
}
export default indexCtrl;
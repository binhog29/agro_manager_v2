class RankingManager {
    constructor() {
        this.btnVoltar = document.getElementById('btn-voltar-mapa');
        this.inicializarEventos();
    }

    inicializarEventos() {
        if (this.btnVoltar) {
            this.btnVoltar.addEventListener('click', () => this.voltarParaMapa());
        }
    }

    voltarParaMapa() {
        window.location.href = '/mapa';
    }
}

// Inicia a classe assim que a tela terminar de carregar
document.addEventListener('DOMContentLoaded', () => {
    const geradorRanking = new RankingManager();
});

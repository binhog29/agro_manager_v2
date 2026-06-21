window.abrirGerenciamentoCultivo = function(loteId, status, tipoCultivo) {
    if (status === 'arado') {
        // Menu de Plantio
        Swal.fire({
            title: 'Escolha a Semente',
            html: `
                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
                    <button class="swal2-styled" style="background: #fbc02d; color: #000; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="plantarSemente(${loteId}, 'soja')">
                        <i class="fas fa-seedling"></i> Plantar Soja
                    </button>
                    <button class="swal2-styled" style="background: #ff9800; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="plantarSemente(${loteId}, 'milho')">
                        <i class="fas fa-leaf"></i> Plantar Milho
                    </button>
                    <hr style="border: 0; border-top: 1px solid #444; margin: 10px 0;">
                    <button class="swal2-styled" style="background: #555; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="reverterParaMato(${loteId})">
                        <i class="fas fa-undo"></i> Abandonar Terra
                    </button>
                </div>
            `,
            background: '#2a2a2a',
            color: '#fff',
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Fechar'
        });
    } else if (status === 'plantado') {
        // Menu de Gerenciamento da Plantação
        Swal.fire({
            title: 'Lavouras Verdes',
            text: `Seu ${tipoCultivo} está crescendo.`,
            icon: 'info',
            background: '#2a2a2a',
            color: '#fff',
            confirmButtonText: 'Aplicar Adubo (Em breve)'
        });
    }
};

window.plantarSemente = function(loteId, tipo) {
    Swal.fire({ title: 'Plantando...', didOpen: () => Swal.showLoading() });
    
    // Essa rota do python precisaremos criar a seguir!
    fetch('/api/cultivo/plantar', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ lote_id: loteId, tipo_cultivo: tipo })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

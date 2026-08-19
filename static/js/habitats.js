// ==========================================
// CONTROLADOR DE HABITATS (Aves, Suínos e Peixes)
// ==========================================

window.construir = function(tipo, custo) {
    Swal.fire({
        title: `Construir ${tipo.toUpperCase()}`,
        text: `Esta obra vai custar R$ ${custo.toLocaleString('pt-BR')}. Confirma?`,
        icon: 'question', background: '#2a2a2a', color: '#fff',
        showCancelButton: true, confirmButtonColor: '#2e7d32', confirmButtonText: 'Construir'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Construindo...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/fazenda/construir', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ tipo: tipo, custo: custo })
            })
            .then(r => r.json()).then(d => {
                if(d.sucesso) {
                    Swal.fire('Pronto!', d.msg, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Erro', d.erro, 'error');
                }
            });
        }
    });
};

// ---------------------------------------------------------
// FUNÇÃO CORRIGIDA PARA ABRIR E CARREGAR OS BICHOS
// ---------------------------------------------------------
window.abrirModalHabitat = function(nomeHabitat) {
    const modal = document.getElementById(`modal-${nomeHabitat}`);
    if (modal) {
        modal.style.display = 'flex';
        carregarAnimaisHabitat(nomeHabitat);
    } else {
        console.error(`Modal modal-${nomeHabitat} não encontrado!`);
    }
};

window.carregarAnimaisHabitat = function(habitat) {
    const divLista = document.getElementById(`lista-${habitat}`);
    if (!divLista) return;

    divLista.innerHTML = `<div style="text-align:center; padding: 20px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Buscando animais...</div>`;
    
    fetch(`/api/pecuaria/habitat/${habitat}`)
    .then(r => r.json())
    .then(d => {
        if(!d.animais || d.animais.length === 0) {
            divLista.innerHTML = `<div style="text-align:center; padding: 20px; color:#f44336; font-weight: bold;">Nenhum animal neste local. Compre no mercado!</div>`;
            return;
        }
        
        let html = '';
        d.animais.forEach(a => {
            const corSaude = a.saude > 70 ? '#4caf50' : (a.saude > 30 ? '#ff9800' : '#f44336');
            const corFome = a.fome < 30 ? '#4caf50' : (a.fome < 70 ? '#ff9800' : '#f44336');
            
            html += `
                <div style="background:#2a2a2a; border:1px solid #444; border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:bold; color:#fff; font-size:14px;">${a.raca} (${a.fase})</div>
                        <div style="font-size:11px; color:#aaa;">ID: #${a.id} | Peso: ${a.peso.toFixed(1)} Kg</div>
                    </div>
                    <div style="text-align: right; font-size: 11px; color: #ccc;">
                        <div><i class="fas fa-heart" style="color:${corSaude};"></i> Saúde: ${a.saude}%</div>
                        <div><i class="fas fa-drumstick-bite" style="color:${corFome};"></i> Fome: ${a.fome}%</div>
                    </div>
                </div>
            `;
        });
        divLista.innerHTML = html;
    });
};

window.alimentarHabitat = function(habitat) {
    Swal.fire({ title: 'Jogando ração...', didOpen: () => Swal.showLoading() });
    
    fetch('/api/pecuaria/alimentar_habitat', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ habitat: habitat })
    })
    .then(r => r.json()).then(d => {
        if(d.sucesso) {
            Swal.fire('Alimentados!', d.msg, 'success');
            carregarAnimaisHabitat(habitat); // Recarrega a lista
        } else {
            Swal.fire('Atenção', d.erro, 'warning');
        }
    });
};

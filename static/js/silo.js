window.prepararVenda = function(itemChave, itemNome, qtdMax) {
    Swal.fire({
        title: `Vender ${itemNome}`,
        text: `Você tem ${qtdMax} kg em estoque.`,
        input: 'number',
        inputAttributes: {
            min: 1,
            max: qtdMax,
            step: 1
        },
        inputValue: qtdMax, // Já sugere vender tudo
        showCancelButton: true,
        confirmButtonText: 'Vender',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2e7d32',
        preConfirm: (qtd) => {
            if (!qtd || qtd <= 0 || qtd > qtdMax) {
                Swal.showValidationMessage('Quantidade inválida!');
            }
            return qtd;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const qtdVenda = parseInt(result.value);
            
            // 🔥 A MÁGICA: Captura o ID da fazenda atual!
            const fazendaId = window.location.pathname.split('/').pop();
            
            Swal.fire({ title: 'Carregando caminhão...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/silo/vender', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                // 🔥 Adiciona o ID da fazenda no envio para o Python
                body: JSON.stringify({ item: itemChave, quantidade: qtdVenda, fazenda_id: fazendaId })
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) {
                    Swal.fire('Vendido!', d.msg, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Erro', d.erro, 'error');
                }
            })
            .catch(() => Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error'));
        }
    });
};

window.expandirSilo = function() {
    Swal.fire({
        title: 'Construtora de Silos',
        html: `
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                <button class="swal2-styled" style="background: #fbc02d; color: #000; width: 100%; margin: 0; font-weight: bold;" onclick="confirmarExpansaoSilo('pequeno', 5000, 500)">Silinho (+500 kg) - R$ 5.000</button>
                <button class="swal2-styled" style="background: #f57c00; color: #fff; width: 100%; margin: 0; font-weight: bold;" onclick="confirmarExpansaoSilo('medio', 45000, 5000)">Silo Médio (+5.000 kg) - R$ 45.000</button>
                <button class="swal2-styled" style="background: #e65100; color: #fff; width: 100%; margin: 0; font-weight: bold;" onclick="confirmarExpansaoSilo('grande', 400000, 50000)">Silo Grande (+50.000 kg) - R$ 400.000</button>
                <button class="swal2-styled" style="background: #bf360c; color: #fff; width: 100%; margin: 0; font-weight: bold;" onclick="confirmarExpansaoSilo('gigante', 3500000, 500000)">Complexo Gigante (+500.000 kg) - R$ 3,5 Milhões</button>
            </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar Obra',
        background: '#2a2a2a', color: '#fff'
    });
};

window.confirmarExpansaoSilo = function(pacote, custo, aumento) {
    Swal.fire({
        title: 'Assinar Contrato?',
        text: `Deseja pagar R$ ${custo.toLocaleString('pt-BR')} para aumentar a capacidade em +${aumento.toLocaleString('pt-BR')} kg?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f57c00',
        confirmButtonText: 'Sim, construir!',
        cancelButtonText: 'Voltar',
        background: '#2a2a2a', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            const fazendaId = window.location.pathname.split('/').pop();
            Swal.fire({ title: 'Equipe em obra...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/silo/expandir', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ fazenda_id: fazendaId, pacote: pacote }) // 🔥 Envia o pacote escolhido
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
                else Swal.fire('Atenção', d.erro, 'warning');
            }).catch(() => Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error'));
        }
    });
};


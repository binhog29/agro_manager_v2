window.prepararVendaInsumo = function(itemChave, itemNome, qtdMax) {
    Swal.fire({
        title: `Vender ${itemNome}`,
        text: `Você tem ${qtdMax} un em estoque.`,
        input: 'number',
        inputAttributes: { min: 1, max: qtdMax, step: 1 },
        inputValue: qtdMax,
        showCancelButton: true,
        confirmButtonText: 'Vender',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d32f2f',
        preConfirm: (qtd) => {
            if (!qtd || qtd <= 0 || qtd > qtdMax) {
                Swal.showValidationMessage('Quantidade inválida!');
            }
            return qtd;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const qtdVenda = parseInt(result.value);
            Swal.fire({ title: 'Despachando...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/armazem/vender', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ item: itemChave, quantidade: qtdVenda })
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) {
                    Swal.fire('Vendido!', d.msg, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Erro', d.erro, 'error');
                }
            })
            .catch(() => Swal.fire('Erro', 'Falha no servidor.', 'error'));
        }
    });
};

window.expandirArmazem = function() {
    Swal.fire({
        title: 'Construtora de Armazéns',
        html: `
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                <button class="swal2-styled" style="background: #fbc02d; color: #000; width: 100%; margin: 0; font-weight: bold;" onclick="confirmarExpansaoArmazem('pequeno', 4000, 300)">Galpãozinho (+300 un) - R$ 4.000</button>
                <button class="swal2-styled" style="background: #f57c00; color: #fff; width: 100%; margin: 0; font-weight: bold;" onclick="confirmarExpansaoArmazem('medio', 35000, 3500)">Armazém Médio (+3.500 un) - R$ 35.000</button>
                <button class="swal2-styled" style="background: #e65100; color: #fff; width: 100%; margin: 0; font-weight: bold;" onclick="confirmarExpansaoArmazem('grande', 300000, 35000)">Armazém Grande (+35.000 un) - R$ 300.000</button>
                <button class="swal2-styled" style="background: #bf360c; color: #fff; width: 100%; margin: 0; font-weight: bold;" onclick="confirmarExpansaoArmazem('gigante', 2500000, 300000)">Complexo Gigante (+300.000 un) - R$ 2,5 Milhões</button>
            </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar Obra',
        background: '#2a2a2a', color: '#fff'
    });
};

window.confirmarExpansaoArmazem = function(pacote, custo, aumento) {
    Swal.fire({
        title: 'Assinar Contrato?',
        text: `Deseja pagar R$ ${custo.toLocaleString('pt-BR')} para aumentar a capacidade do Armazém em +${aumento.toLocaleString('pt-BR')} un?`,
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
            
            fetch('/api/armazem/expandir', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ fazenda_id: fazendaId, pacote: pacote })
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
                else Swal.fire('Atenção', d.erro, 'warning');
            }).catch(() => Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error'));
        }
    });
};

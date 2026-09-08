window.prepararVendaGalpao = function(itemChave, itemNome, qtdMax) {
    Swal.fire({
        title: `Vender ${itemNome}`,
        // 🔥 AQUI ENTRA O AVISO VISUAL EM HTML 🔥
        html: `
            <div style="color: #fff; margin-bottom: 10px;">
                Você tem <b>${qtdMax} kg</b> em estoque.
            </div>
            
            <div style="background: #1a1a1a; border: 1px dashed #ff9800; border-radius: 8px; padding: 12px; margin-top: 15px; margin-bottom: 15px; font-size: 13px; color: #ccc; text-align: left;">
                <p style="margin: 0 0 8px 0;"><i class="fas fa-info-circle" style="color: #ff9800;"></i> O preço base de venda acompanha o <b>Fator de Mercado</b> diário.</p>
                <p style="margin: 0;"><i class="fas fa-file-invoice-dollar" style="color: #ff9800;"></i> Serão retidos <b>4%</b> na fonte (1.5% FUNRURAL + 2.5% Logística).</p>
            </div>
        `,
        input: 'number',
        inputAttributes: {
            min: 1,
            max: qtdMax,
            step: 1
        },
        inputValue: qtdMax, // Já sugere vender tudo
        showCancelButton: true,
        confirmButtonText: 'Confirmar Venda',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#8d6e63',
        background: '#2a2a2a', 
        color: '#fff',
        preConfirm: (qtd) => {
            if (!qtd || qtd <= 0 || qtd > qtdMax) {
                Swal.showValidationMessage('Quantidade inválida!');
            }
            return qtd;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const qtdVenda = parseInt(result.value);
            
            // Captura o ID da fazenda atual pela URL
            const fazendaId = window.location.pathname.split('/').pop();
            
            Swal.fire({ title: 'Carregando caminhão...', didOpen: () => Swal.showLoading() });
            
            // 🔥 Rota apontando para o nosso novo backend do Galpão!
            fetch('/api/galpao/vender', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ item: itemChave, quantidade: qtdVenda, fazenda_id: fazendaId })
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) {
                    Swal.fire({title: 'Vendido!', text: d.msg, icon: 'success', background: '#2a2a2a', color: '#fff'})
                    .then(() => location.reload());
                } else {
                    Swal.fire({title: 'Erro', text: d.erro, icon: 'error', background: '#2a2a2a', color: '#fff'});
                }
            })
            .catch(() => Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error'));
        }
    });
};

/*
 * Módulo de Animação Aérea - Circuito Completo (Ida e Volta com Conversão de Direção)
 */
(function (global) {
  'use strict';

  // Garante que a regra CSS da névoa existe no documento
  if (!document.getElementById('estilo-animacao-nevoa')) {
    const style = document.createElement('style');
    style.id = 'estilo-animacao-nevoa';
    style.innerHTML = `
      @keyframes sumirNevoa {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.9; }
        100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  window.executarAnimacaoAviao = function(callbackConclusao) {
    // Procura por um container válido na tela de forma segura
    const containerFazenda = document.getElementById('container-mapa') || 
                             document.querySelector('.mapa-sede-container') || 
                             document.getElementById('lavoura-2d-container') || 
                             document.querySelector('.fazenda-wrapper') || 
                             document.body;

    if (!containerFazenda) {
      if (typeof callbackConclusao === 'function') callbackConclusao();
      return;
    }

    const antigo = document.getElementById('overlay-animacao-aviao');
    if (antigo) antigo.remove();
    
    if (window.getComputedStyle(containerFazenda).position === 'static') {
      containerFazenda.style.position = 'relative';
    }

    const container = document.createElement('div');
    container.id = 'overlay-animacao-aviao';
    container.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:99999;pointer-events:none;overflow:hidden;border-radius:inherit;';

    const aviaoWrapper = document.createElement('div');
    // Começa fora da tela à esquerda, alinhado à altura dos cultivos (top: 30%)
    aviaoWrapper.style.cssText = 'position:absolute;left:-15%;top:30%;width:84px;height:52px;transform:translate(-50%,-50%);will-change:left,top,transform;transition:left 3s linear, top 3s linear;z-index:100000;';

    // Imagem com scaleX(-1) para apontar para a direita na ida
    aviaoWrapper.innerHTML = `
      <img id="img-aviao-agricola" src="/static/img/aviao_agricola_lado.png" alt="Avião Agrícola" style="width:100%;height:100%;object-fit:contain;transform:scaleX(-1);filter:drop-shadow(3px 5px 4px rgba(0,0,0,0.6));" onerror="this.src='/static/img/trator.png'" />
    `;

    const sprayContainer = document.createElement('div');
    sprayContainer.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:99998;';

    container.appendChild(sprayContainer);
    container.appendChild(aviaoWrapper);
    containerFazenda.appendChild(container);

    let isVoltando = false;

    setTimeout(() => {
      // 1ª FASE: IDA (Esquerda para Direita)
      aviaoWrapper.style.left = '110%'; 
      aviaoWrapper.style.top = '30%';

      const intervaloSpray = setInterval(() => {
        const rect = aviaoWrapper.getBoundingClientRect();
        const parentRect = containerFazenda.getBoundingClientRect();
        
        if (parentRect.width === 0) return;

        const posX = ((rect.left + rect.width / 2 - parentRect.left) / parentRect.width) * 100;
        const posY = ((rect.top + rect.height / 2 - parentRect.top) / parentRect.height) * 100;

        // Pulveriza na ida se estiver sobre os cultivos (5% a 50%)
        if (!isVoltando && posX >= 5 && posX <= 45) {
          criarParticulaNevoa(posX, posY, sprayContainer);
        }
        
        // Pulveriza na volta se estiver a regressar (de 50% para 5%)
        if (isVoltando && posX >= 8 && posX <= 50) {
          criarParticulaNevoa(posX, posY, sprayContainer);
        }
      }, 120);

      // Fim da Ida -> Inicia a Volta após 3 segundos
      setTimeout(() => {
        isVoltando = true;
        const imgElement = document.getElementById('img-aviao-agricola');
        if (imgElement) {
          // Remove o scaleX(-1) para inverter o avião e apontar para a esquerda na volta
          imgElement.style.transform = 'scaleX(1)';
        }

        // Altera a transição para descida/ajuste de linha e retorno à esquerda
        aviaoWrapper.style.transition = 'left 3s linear, top 1s ease';
        aviaoWrapper.style.top = '40%'; // Desce ligeiramente para a linha de baixo das lavouras
        aviaoWrapper.style.left = '-15%'; // Retorna para fora da tela à esquerda

      }, 3000);

      // Encerra toda a animação e limpa os elementos após 6.5 segundos (Ida + Volta)
      setTimeout(() => {
        clearInterval(intervaloSpray);
        if (container && container.parentNode) {
          container.remove();
        }
        if (typeof callbackConclusao === 'function') callbackConclusao();
      }, 6500);

    }, 100);
  };

  function criarParticulaNevoa(posX, posY, sprayContainer) {
    const nevoa = document.createElement('div');
    nevoa.style.cssText = `
      position: absolute;
      left: ${posX}%;
      top: ${posY + 12}%;
      width: 44px;
      height: 44px;
      background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(46,204,113,0.42) 40%, transparent 100%);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      animation: sumirNevoa 1.2s forwards;
      z-index: 99997;
    `;
    sprayContainer.appendChild(nevoa);
    setTimeout(() => nevoa.remove(), 1200);
  }

  window.dispararAviaoAgricola = async function(modoAluguelOuId = false, tipoServico = null) {
    const pathParts = window.location.pathname.split('/');
    const fazendaId = pathParts.includes('fazenda') ? pathParts[pathParts.indexOf('fazenda') + 1] : pathParts.pop();

    let eAluguel = false;
    let maquinaId = null;

    if (modoAluguelOuId === true) {
        eAluguel = true;
    } else if (typeof modoAluguelOuId === 'number' || (typeof modoAluguelOuId === 'string' && !isNaN(modoAluguelOuId))) {
        maquinaId = modoAluguelOuId;
        eAluguel = false;
    } else {
        eAluguel = Boolean(modoAluguelOuId);
    }

    let servicoFinal = tipoServico;

    if (!eAluguel && !servicoFinal) {
        const { value: escolha } = await Swal.fire({
            title: '<span style="color: #fff; font-size: 20px;"><i class="fas fa-plane-departure" style="color: #e91e63;"></i> Operação Aérea</span>',
            html: `
                <div style="color: #aaa; font-size: 13px; margin-bottom: 15px;">Selecione o serviço que o Avião Próprio irá realizar na lavoura:</div>
                <div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">
                    <label style="background: #252533; border: 2px solid #3d3d5c; padding: 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 12px;" onclick="this.querySelector('input').checked=true;">
                        <input type="radio" name="servico_aviao" value="defensivo" checked style="accent-color: #e91e63; width: 18px; height: 18px;">
                        <div>
                            <div style="color: #fff; font-weight: bold; font-size: 14px;">🛩️ Defensivos Agrícolas</div>
                            <div style="color: #888; font-size: 11px;">Pulverização contra pragas (+15% bónus)</div>
                        </div>
                    </label>
                    <label style="background: #252533; border: 2px solid #3d3d5c; padding: 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 12px;" onclick="this.querySelector('input').checked=true;">
                        <input type="radio" name="servico_aviao" value="adubo" style="accent-color: #e91e63; width: 18px; height: 18px;">
                        <div>
                            <div style="color: #fff; font-weight: bold; font-size: 14px;">🌱 Adubação Aérea</div>
                            <div style="color: #888; font-size: 11px;">Restaura a fertilidade do solo (100%)</div>
                        </div>
                    </label>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Decolar 🛩️',
            cancelButtonText: 'Cancelar',
            background: '#1a1a24',
            color: '#fff',
            confirmButtonColor: '#e91e63',
            cancelButtonColor: '#444',
            preConfirm: () => {
                const selecionado = document.querySelector('input[name="servico_aviao"]:checked');
                return selecionado ? selecionado.value : null;
            }
        });

        if (!escolha) return;
        servicoFinal = (escolha === 'adubo') ? 'aluguel_aviao_adubo' : 'aluguel_aviao';
    } else if (eAluguel && !servicoFinal) {
        servicoFinal = 'aluguel_aviao';
    }

    Swal.fire({
        title: 'A verificar condições do voo...',
        background: '#1a1a24',
        color: '#fff',
        didOpen: () => Swal.showLoading()
    });

        fetch(`/api/cultivo/aviao_pulverizar_tudo/${fazendaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            modo_aluguel: eAluguel, 
            maquina_id: maquinaId,
            tipo: servicoFinal 
        })
    })
    .then(r => r.json())
    .then(d => {
        if (d.sucesso) {
            Swal.close();
            window.executarAnimacaoAviao(function() {
                Swal.fire({
                    title: '🛩️ Sucesso Aéreo!',
                    text: d.msg,
                    icon: 'success',
                    background: '#1a1a24',
                    color: '#fff'
                }).then(() => {
                    // CORREÇÃO: Só abre o barracão se NÃO for aluguel (ou seja, se for o avião do barracão)
                    if (!eAluguel && typeof abrirPainelBarracao === 'function') {
                        abrirPainelBarracao();
                    } else {
                        // Se foi aluguel pela concessionária, apenas atualiza a página/mapa sem abrir o barracão indesejado
                        location.reload();
                    }
                });
            });
        } else {
            Swal.fire('Atenção', d.erro, 'warning');
        }
    })
    .catch(() => {
        Swal.fire('Erro', 'Falha ao processar a solicitação aérea.', 'error');
    });
  };

  window.executarVooAviaoBarracao = window.dispararAviaoAgricola;

})(window);

import { ArrowLeft, FileText } from "lucide-react";

const TERMS_VERSION = "1.0";
const TERMS_DATE = "01 de abril de 2025";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : window.close()}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Termos de Uso</h1>
              <p className="text-sm text-gray-500">C3D Manager® — Versão {TERMS_VERSION} — Vigência a partir de {TERMS_DATE}</p>
            </div>
          </div>
          <div className="h-px bg-gray-200" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8 text-gray-700">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Aceitação dos Termos</h2>
            <p className="text-sm leading-relaxed">
              Ao acessar e utilizar o sistema C3D Manager®, você concorda em cumprir e estar vinculado aos presentes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar o sistema. O uso continuado do sistema após a publicação de alterações constitui aceitação tácita das mudanças.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Descrição do Serviço</h2>
            <p className="text-sm leading-relaxed mb-3">
              O C3D Manager® é uma plataforma de gestão de orçamentos, clientes, estoque e financeiro voltada para negócios de impressão 3D. O sistema é disponibilizado como Software como Serviço (SaaS), sendo acessado via navegador web mediante cadastro e assinatura.
            </p>
            <p className="text-sm leading-relaxed">
              O serviço inclui funcionalidades como: calculadora de orçamentos, gestão de clientes, controle de estoque de materiais, histórico de pedidos, módulo financeiro, relatórios e configurações da empresa.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Cadastro e Conta de Acesso</h2>
            <p className="text-sm leading-relaxed mb-3">
              Para utilizar o sistema, é necessário criar uma conta com informações verídicas e atualizadas. Você é responsável por manter a confidencialidade das suas credenciais de acesso e por todas as atividades realizadas com sua conta.
            </p>
            <p className="text-sm leading-relaxed">
              Em caso de suspeita de uso não autorizado da sua conta, você deve comunicar imediatamente ao suporte. O administrador da plataforma reserva-se o direito de encerrar contas com informações incorretas ou que violem estes termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Período de Teste (Trial)</h2>
            <p className="text-sm leading-relaxed mb-3">
              Novas contas podem ter acesso a um período de avaliação gratuita com duração determinada no momento do cadastro. Durante o período de teste, o usuário tem acesso às funcionalidades da plataforma de forma integral.
            </p>
            <p className="text-sm leading-relaxed">
              Ao término do período de teste, o acesso será suspenso até que seja contratada uma assinatura ativa. O administrador da plataforma pode encerrar ou estender o período de teste a seu critério.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Assinatura e Pagamento</h2>
            <p className="text-sm leading-relaxed mb-3">
              O acesso ao sistema após o período de teste está condicionado ao pagamento de assinatura mensal, conforme os valores acordados com o administrador da plataforma. Os valores e condições de pagamento serão informados diretamente pelo suporte.
            </p>
            <p className="text-sm leading-relaxed">
              O não pagamento da assinatura poderá resultar na suspensão ou cancelamento do acesso à conta, sem prejuízo das obrigações financeiras existentes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. Responsabilidades do Usuário</h2>
            <p className="text-sm leading-relaxed mb-3">Ao utilizar o sistema, o usuário compromete-se a:</p>
            <ul className="text-sm leading-relaxed space-y-1.5 list-disc pl-5">
              <li>Utilizar o sistema apenas para finalidades lícitas e legítimas;</li>
              <li>Não compartilhar suas credenciais de acesso com terceiros não autorizados;</li>
              <li>Manter as informações cadastradas atualizadas e verídicas;</li>
              <li>Não tentar acessar dados de outros usuários ou empresas cadastradas na plataforma;</li>
              <li>Não realizar engenharia reversa, cópia ou reprodução do sistema ou de seus algoritmos;</li>
              <li>Zelar pela segurança de seus dispositivos utilizados para acessar o sistema.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Propriedade dos Dados</h2>
            <p className="text-sm leading-relaxed mb-3">
              Os dados inseridos no sistema pelo usuário (clientes, materiais, pedidos, configurações, etc.) são de propriedade do usuário titular da conta. O administrador da plataforma não utilizará esses dados para finalidades além das necessárias para o funcionamento do serviço.
            </p>
            <p className="text-sm leading-relaxed">
              Em caso de cancelamento da conta, o usuário poderá solicitar exportação dos seus dados antes do encerramento definitivo. Após o encerramento, os dados poderão ser excluídos definitivamente dos servidores.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. Disponibilidade e Manutenção</h2>
            <p className="text-sm leading-relaxed">
              O administrador da plataforma empenha-se em manter o sistema disponível, mas não garante disponibilidade ininterrupta. Podem ocorrer períodos de manutenção, atualizações ou interrupções técnicas. Não haverá responsabilidade por perdas decorrentes de indisponibilidade temporária do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. Limitação de Responsabilidade</h2>
            <p className="text-sm leading-relaxed">
              O C3D Manager® é disponibilizado "no estado em que se encontra". O administrador da plataforma não se responsabiliza por perdas de dados, lucros cessantes, danos indiretos ou quaisquer prejuízos resultantes do uso ou impossibilidade de uso do sistema, mesmo que previamente alertado sobre a possibilidade de tais danos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. Alterações nos Termos</h2>
            <p className="text-sm leading-relaxed">
              Estes Termos de Uso podem ser atualizados a qualquer momento. O usuário será notificado sobre mudanças relevantes e precisará aceitar os novos termos para continuar utilizando o sistema. A versão em vigor é sempre a mais recente, identificada pelo número de versão no início deste documento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">11. Foro e Legislação</h2>
            <p className="text-sm leading-relaxed">
              Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa decorrente destes termos será resolvida no foro da comarca do domicílio do administrador da plataforma, com renúncia expressa a qualquer outro foro, por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">12. Contato</h2>
            <p className="text-sm leading-relaxed">
              Dúvidas sobre estes Termos de Uso podem ser encaminhadas para o suporte da plataforma via WhatsApp. Nosso time está disponível para esclarecimentos durante o horário comercial.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
            C3D Manager® — Termos de Uso — Versão {TERMS_VERSION} — Última atualização: {TERMS_DATE}
          </div>
        </div>
      </div>
    </div>
  );
}

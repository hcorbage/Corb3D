import { ArrowLeft, ShieldCheck } from "lucide-react";

export const PRIVACY_VERSION = "1.0";
const PRIVACY_DATE = "01 de abril de 2025";

export function PrivacyBodyContent({ compact = false }: { compact?: boolean }) {
  const h2 = compact
    ? "text-sm font-bold text-gray-900 mb-2"
    : "text-lg font-bold text-gray-900 mb-3";
  const p = "text-sm leading-relaxed";

  return (
    <div className="space-y-6 text-gray-700">
      <section>
        <h2 className={h2}>1. Introdução</h2>
        <p className={p}>
          Esta Política de Privacidade descreve como o C3D Manager® coleta, utiliza, armazena e protege as informações dos usuários da plataforma. Nos comprometemos com a transparência no tratamento de dados e com o cumprimento da Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
        </p>
      </section>

      <section>
        <h2 className={h2}>2. Dados Coletados</h2>
        <p className={`${p} mb-3`}>Durante o uso do sistema, coletamos as seguintes categorias de dados:</p>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">Dados de cadastro</p>
            <p className="text-sm text-gray-600">Nome completo, CPF/CNPJ, data de nascimento, login e senha (armazenada com criptografia).</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">Dados de acesso e uso</p>
            <p className="text-sm text-gray-600">Endereço IP no momento do aceite dos termos, data e hora de aceite, versão dos termos aceitos, sessões de acesso.</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">Dados operacionais inseridos pelo usuário</p>
            <p className="text-sm text-gray-600">Informações de clientes, materiais, pedidos, orçamentos, dados financeiros e demais conteúdos criados no uso normal do sistema. Esses dados pertencem ao usuário e são tratados apenas para prestar o serviço contratado.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className={h2}>3. Base Legal para o Tratamento</h2>
        <p className={`${p} mb-2`}>O tratamento dos dados pessoais é realizado com as seguintes bases legais (art. 7º da LGPD):</p>
        <ul className="text-sm leading-relaxed space-y-1.5 list-disc pl-5">
          <li><strong>Execução de contrato:</strong> para prestação do serviço contratado (acesso à plataforma);</li>
          <li><strong>Consentimento:</strong> para coleta do IP e registro formal do aceite dos termos;</li>
          <li><strong>Legítimo interesse:</strong> para manutenção da segurança do sistema e prevenção a fraudes;</li>
          <li><strong>Obrigação legal:</strong> quando exigido por lei ou ordem judicial.</li>
        </ul>
      </section>

      <section>
        <h2 className={h2}>4. Finalidade do Tratamento</h2>
        <p className={`${p} mb-2`}>Os dados coletados são utilizados para:</p>
        <ul className="text-sm leading-relaxed space-y-1.5 list-disc pl-5">
          <li>Criar e gerenciar contas de acesso;</li>
          <li>Prestar os serviços contratados e manter o sistema funcionando;</li>
          <li>Garantir a segurança e integridade do sistema;</li>
          <li>Registrar formalmente o aceite dos termos de uso;</li>
          <li>Comunicar ao usuário sobre manutenções, atualizações ou mudanças nos termos;</li>
          <li>Cumprir obrigações legais e regulatórias.</li>
        </ul>
      </section>

      <section>
        <h2 className={h2}>5. Compartilhamento de Dados</h2>
        <p className={`${p} mb-2`}>
          Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins comerciais. Os dados podem ser acessados apenas nas seguintes situações:
        </p>
        <ul className="text-sm leading-relaxed space-y-1.5 list-disc pl-5">
          <li>Provedores de infraestrutura (hospedagem e banco de dados) que processam os dados exclusivamente para operar o serviço;</li>
          <li>Quando exigido por lei, ordem judicial ou autoridade competente;</li>
          <li>Com consentimento expresso do titular dos dados.</li>
        </ul>
      </section>

      <section>
        <h2 className={h2}>6. Armazenamento e Segurança</h2>
        <p className={`${p} mb-3`}>
          Os dados são armazenados em banco de dados PostgreSQL hospedado em ambiente seguro. As senhas são armazenadas com hash criptográfico (bcrypt) e nunca em texto puro.
        </p>
        <p className={p}>
          Adotamos medidas técnicas e organizacionais para proteger os dados contra acesso não autorizado, alteração, divulgação ou destruição, incluindo controle de acesso por função (RBAC), isolamento de dados por empresa (multi-tenancy) e comunicação via protocolo HTTPS.
        </p>
      </section>

      <section>
        <h2 className={h2}>7. Retenção de Dados</h2>
        <p className={p}>
          Os dados são mantidos enquanto a conta estiver ativa ou pelo período necessário para cumprimento de obrigações legais. Após o encerramento da conta, os dados operacionais serão excluídos em até 90 dias, salvo exigência legal de retenção por período maior. O registro do aceite dos termos poderá ser mantido por prazo superior para fins de auditoria e comprovação legal.
        </p>
      </section>

      <section>
        <h2 className={h2}>8. Seus Direitos (LGPD)</h2>
        <p className={`${p} mb-2`}>
          Em conformidade com a LGPD, o titular dos dados tem os seguintes direitos:
        </p>
        <ul className="text-sm leading-relaxed space-y-1.5 list-disc pl-5">
          <li><strong>Acesso:</strong> saber quais dados pessoais são tratados;</li>
          <li><strong>Correção:</strong> solicitar correção de dados incorretos ou desatualizados;</li>
          <li><strong>Eliminação:</strong> solicitar exclusão dos dados (quando não houver obrigação legal de retenção);</li>
          <li><strong>Portabilidade:</strong> solicitar exportação dos seus dados em formato estruturado;</li>
          <li><strong>Revogação do consentimento:</strong> revogar o consentimento dado, sem prejudicar tratamentos anteriores;</li>
          <li><strong>Informação sobre compartilhamento:</strong> saber com quem seus dados são compartilhados;</li>
          <li><strong>Oposição:</strong> opor-se a tratamento realizado com base em legítimo interesse.</li>
        </ul>
        <p className={`${p} mt-3`}>
          Para exercer qualquer desses direitos, entre em contato pelo e-mail{" "}
          <a href="mailto:contato@corb3d.com.br" className="text-purple-600 underline underline-offset-2 hover:text-purple-800">
            contato@corb3d.com.br
          </a>.
        </p>
      </section>

      <section>
        <h2 className={h2}>9. Cookies e Sessões</h2>
        <p className={p}>
          O sistema utiliza cookies de sessão para manter o usuário autenticado durante o uso. Esses cookies são temporários e expiram ao encerrar a sessão. Não utilizamos cookies de rastreamento ou publicidade.
        </p>
      </section>

      <section>
        <h2 className={h2}>10. Alterações nesta Política</h2>
        <p className={p}>
          Esta Política de Privacidade pode ser atualizada para refletir mudanças nas práticas de tratamento de dados ou na legislação aplicável. Quando houver mudanças relevantes, o usuário será notificado e deverá aceitar formalmente a nova versão para continuar utilizando o sistema.
        </p>
      </section>

      <section>
        <h2 className={h2}>11. Encarregado de Dados (DPO) e Contato</h2>
        <p className={p}>
          O responsável pelo tratamento dos dados pessoais no âmbito desta plataforma é o administrador da plataforma C3D Manager®. Para dúvidas, solicitações ou reclamações relacionadas à privacidade e ao tratamento de dados, entre em contato pelo e-mail{" "}
          <a href="mailto:contato@corb3d.com.br" className="text-purple-600 underline underline-offset-2 hover:text-purple-800">
            contato@corb3d.com.br
          </a>{" "}
          ou via WhatsApp.
        </p>
      </section>

      <div className="pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
        C3D Manager® — Política de Privacidade — Versão {PRIVACY_VERSION} — Última atualização: {PRIVACY_DATE}
      </div>
    </div>
  );
}

export default function PrivacyPolicy() {
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
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-50 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Política de Privacidade</h1>
              <p className="text-sm text-gray-500">C3D Manager® — Versão {PRIVACY_VERSION} — Vigência a partir de {PRIVACY_DATE}</p>
            </div>
          </div>
          <div className="h-px bg-gray-200" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <PrivacyBodyContent />
        </div>
      </div>
    </div>
  );
}

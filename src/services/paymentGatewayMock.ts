export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  qrData: string;
  expiration: Date;
}

/**
 * SIMULADOR DE PASARELA DE PAGOS (API MOCK)
 * ----------------------------------------
 * Este archivo simula el comportamiento de una pasarela real (como Libélula o Multipago).
 * Cuando contrates un servicio real, cambiarás el interior de "requestQR" por un fetch() 
 * real hacia la API de la empresa, por ejemplo:
 * 
 * const response = await fetch("https://api.libelula.bo/v1/qr/generate", {
 *    method: "POST",
 *    headers: { "Authorization": "Bearer TU_TOKEN_SECRETO" },
 *    body: JSON.stringify({ amount: amount, business_name: "PIL CHUQUISACA" })
 * });
 */

export const PaymentGateway = {
  // Simula la petición HTTP al servidor del banco para obtener un QR interoperable
  requestQR: async (amount: number): Promise<PaymentResponse> => {
    return new Promise((resolve) => {
      // Simulamos la latencia de red (1.5 segundos en responder)
      setTimeout(() => {
        const transactionId = "TXN-" + Math.random().toString(36).substring(2, 9).toUpperCase();
        
        resolve({
          success: true,
          transactionId: transactionId,
          // Datos ficticios pero similares a un QR interoperable real del BCB
          qrData: `00020101021143500010041BCB0021000000000000000005204000053030685404${amount.toFixed(2).replace('.','')}5802BO5918PIL CHUQUISACA S.A.6005SUCRE62240120${transactionId}6304A1B2`,
          expiration: new Date(Date.now() + 15 * 60000) // Expira en 15 minutos
        });
      }, 1500);
    });
  },

  // Simula el servidor recibiendo un Webhook del Banco Central e informando a nuestra UI
  simulateWebhookPayment: (transactionId: string, onSuccess: () => void) => {
    // En la vida real, tu backend de Node.js recibiría un POST en /api/webhook 
    // y enviaría un evento a tu Frontend (vía Socket.io o Polling). 
    // Aquí simulamos que el banco confirmó el pago exitosamente.
    setTimeout(() => {
      console.log(`[Webhook Recibido] Pago Confirmado para Transacción: ${transactionId}`);
      onSuccess();
    }, 1000); // 1 segundo para procesar
  }
};

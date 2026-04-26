import { Router } from 'express';

const router: Router = Router();

// In-memory task store for demo purposes
const tasks = new Map<string, any>();

/**
 * POST /api/a2a
 */
router.post('/', async (req, res) => {
  try {
    const { method, params = {}, id } = req.body;

    console.log(`[A2A API] Method: ${method}, ID: ${id}`);

    switch (method) {
      case "message/send":
        return handleMessageSend(res, id, params);
      case "tasks/get":
        return handleTasksGet(res, id, params);
      default:
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
    }
  } catch (error: any) {
    console.error("[A2A API] Error:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: "Internal server error", data: error.message }
    });
  }
});

/**
 * GET /api/a2a for discovery
 */
router.get('/', (req, res) => {
  res.json({
    name: "Kite A2A Server",
    version: "1.0.0",
    protocols: ["a2a-jsonrpc-2.0"],
    endpoints: {
      a2a: "/api/a2a"
    }
  });
});

function handleMessageSend(res: any, id: any, params: any) {
  const parts = params.message?.parts || [];
  const dataPart = parts.find((p: any) => p.type === 'data')?.data;

  if (!dataPart || !dataPart.action) {
    return res.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32602, message: "No action found in message parts" }
    });
  }

  const taskId = `task_${Date.now()}`;
  
  if (dataPart.action === 'purchase' || dataPart.action === 'access-resource') {
    // Create a new task requiring payment
    const task = {
      id: taskId,
      status: {
        state: "input-required",
        message: {
          role: "assistant",
          parts: [{
            type: "text", 
            text: `Payment required for ${dataPart.name || 'item'}. Please pay ${dataPart.priceUsdc || '0.50'} USDC to 0xb23c769dFc7ef020ec60A19567aB675C46a49910 on Kite Testnet.`
          }, {
            type: "data",
            data: {
              extensionUri: "https://x402.org/v2",
              networks: [{ network: "kite-testnet", chainId: 2368 }],
              asset: "USDC",
              amount: (dataPart.priceUsdc || 0.50).toString(),
              payTo: "0xb23c769dFc7ef020ec60A19567aB675C46a49910",
              scheme: "exact",
              taskId: taskId
            }
          }]
        },
        timestamp: new Date().toISOString()
      }
    };
    tasks.set(taskId, task);
    return res.json({ jsonrpc: "2.0", id, result: task });
  }

  if (dataPart.action === 'submit-payment') {
    const existingTaskId = dataPart.taskId;
    const payment = dataPart.payment;

    if (!existingTaskId || !payment?.transactionHash) {
      return res.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "Missing taskId or payment hash" }
      });
    }

    // In a real app, verify the tx on-chain here
    const task = {
      id: existingTaskId,
      status: {
        state: "completed",
        message: {
          role: "assistant",
          parts: [{
            type: "text",
            text: "Payment verified! Your order is confirmed."
          }]
        },
        timestamp: new Date().toISOString()
      },
      artifacts: [{
        name: "Receipt",
        parts: [{
          type: "text",
          text: `Order confirmed. Tx: ${payment.transactionHash}`
        }]
      }]
    };
    tasks.set(existingTaskId, task);
    return res.json({ jsonrpc: "2.0", id, result: task });
  }

  return res.json({
    jsonrpc: "2.0",
    id,
    error: { code: -32602, message: `Unknown action: ${dataPart.action}` }
  });
}

function handleTasksGet(res: any, id: any, params: any) {
  const taskId = params.id;
  const task = tasks.get(taskId);
  if (!task) {
    return res.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32001, message: "Task not found" }
    });
  }
  return res.json({ jsonrpc: "2.0", id, result: task });
}

export default router;

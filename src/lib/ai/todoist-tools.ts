import { z } from "zod"
import { TodoistApi } from "@doist/todoist-api-typescript"
import {
  addTasks,
  completeTasks,
  findTasks,
  findTasksByDate,
  getOverview,
  updateTasks,
} from "@doist/todoist-ai"
import Anthropic from "@anthropic-ai/sdk"
import type { ChatMessage } from "./client"

// @doist/todoist-ai bundles its own copy of @doist/todoist-api-typescript, so the
// two TodoistApi classes are structurally incompatible via private 'authToken'. We
// use `never` casts here — runtime behaviour is identical since the classes are the same.
type AnyExecutor = (
  args: Record<string, unknown>,
  client: never,
) => Promise<{ textContent?: string; structuredContent?: unknown }>

const EXECUTORS: Record<string, AnyExecutor> = {
  [getOverview.name]: (a, c) => getOverview.execute(a as never, c),
  [findTasks.name]: (a, c) => findTasks.execute(a as never, c),
  [findTasksByDate.name]: (a, c) => findTasksByDate.execute(a as never, c),
  [addTasks.name]: (a, c) => addTasks.execute(a as never, c),
  [completeTasks.name]: (a, c) => completeTasks.execute(a as never, c),
  [updateTasks.name]: (a, c) => updateTasks.execute(a as never, c),
}

const TOOLS_META = [getOverview, findTasks, findTasksByDate, addTasks, completeTasks, updateTasks]

function buildToolDefinitions(): Anthropic.Messages.Tool[] {
  return TOOLS_META.map((tool) => {
    const jsonSchema = z.toJSONSchema(z.object(tool.parameters as z.ZodRawShape)) as {
      properties?: Record<string, unknown>
      required?: string[]
    }
    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: "object" as const,
        properties: jsonSchema.properties ?? {},
        ...(jsonSchema.required?.length ? { required: jsonSchema.required } : {}),
      },
    }
  })
}

const TOOL_DEFINITIONS = buildToolDefinitions()

/**
 * Call Anthropic with Todoist tools available.
 * Handles the tool-use loop: execute any tool_use blocks and feed results back.
 * Returns the final text response.
 */
export async function callAnthropicWithTodoistTools(
  client: Anthropic,
  system: string,
  messages: ChatMessage[],
  todoistToken: string,
  maxTokens = 1500,
): Promise<string> {
  const todoistClient = new TodoistApi(todoistToken)

  const params: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  for (let round = 0; round < 5; round++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: params,
      tools: TOOL_DEFINITIONS,
    })

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((b) => b.type === "text")
      return textBlock?.type === "text" ? textBlock.text : ""
    }

    params.push({ role: "assistant", content: response.content })

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== "tool_use") continue
      const executor = EXECUTORS[block.name]
      let resultText: string
      if (!executor) {
        resultText = `Unknown tool: ${block.name}`
      } else {
        try {
          const result = await executor(block.input as Record<string, unknown>, todoistClient as never)
          resultText = result.textContent ?? JSON.stringify(result.structuredContent ?? {})
        } catch (err) {
          resultText = `Tool error: ${err instanceof Error ? err.message : String(err)}`
        }
      }
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultText })
    }

    params.push({ role: "user", content: toolResults })
  }

  // Safety fallback after max rounds — call once more without tools
  const final = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system,
    messages: params,
  })
  const textBlock = final.content.find((b) => b.type === "text")
  return textBlock?.type === "text" ? textBlock.text : ""
}

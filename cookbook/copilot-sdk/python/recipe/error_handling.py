#!/usr/bin/env python3

import asyncio
from copilot import CopilotClient, SessionConfig, MessageOptions

async def main():
    client = CopilotClient()

    try:
        await client.start()
        session = await client.create_session(SessionConfig(model="gpt-5"))

        response = await session.send_and_wait(MessageOptions(prompt="Hello!"))

        if response:
            print(response.data.content)

        await session.destroy()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await client.stop()

if __name__ == "__main__":
    asyncio.run(main())

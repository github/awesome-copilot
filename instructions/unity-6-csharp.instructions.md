---
description: "Unity 6.3 LTS C# rules: read input through the Input System package instead of Input.GetAxis, use Rigidbody.linearVelocity, replace obsolete FindObjectOfType with FindAnyObjectByType or serialized references, and never edit .meta files."
applyTo: "**/*.cs"
---

# Unity 6 C# rules

Pinned to Unity 6.3 LTS (6000.3.x, supported through December 2027). The same calls are valid on the 6000.6 update line checked 2026-10-15, with one exception called out below. Do not emit Unity 2022 or earlier APIs.

## Project files
- Never delete, rename, or hand-edit a `.meta` file. Unity stores the asset GUID there. Deleting one reimports the asset and breaks every reference to it.
- Do not run `dotnet build` to "check" a Unity project. The editor compiles assemblies itself. A bare `dotnet build` fails or compiles the wrong set of asmdefs.
- Edit scripts under `Assets/`. Do not write into `Library/`, `Temp/`, `Obj/`, or `Logs/`.

## Finding objects
- `Object.FindObjectOfType` and `FindObjectsOfType` are obsolete. Do not use them.
- When any match is fine, use `Object.FindAnyObjectByType<T>()`. Do not call it from `Update` or `FixedUpdate`. Cache the result in `Awake` or `Start`.
- On Unity 6.6 and newer, `FindFirstObjectByType` is also obsolete, because it depended on InstanceID ordering. Do not use it. If you need a specific object, query with `FindObjectsByType<T>()` and sort by something real, such as sibling index.
- Prefer a serialized reference (`[SerializeField] private Player player;`) over any Find call.

## Input and physics
- Read input through the Input System package (`UnityEngine.InputSystem`). Do not call `Input.GetAxis`, `Input.GetKey`, or `Input.GetButton`. Those throw when the project is set to the new Input System only, which is the Unity 6 default for new projects.
- Read buttons in `Update`. Write to a Rigidbody in `FixedUpdate`.
- The velocity property is `Rigidbody.linearVelocity` (world space, units per second). `Rigidbody.velocity` does not exist in Unity 6. Do not assign `linearVelocity` every physics step. Use `AddForce` for ongoing motion and set `linearVelocity` only for an instant change such as a jump.
- Cache `GetComponent<Rigidbody>()` once. Do not call `GetComponent`, `Find`, or `Camera.main` inside `Update`.

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

public class Jumper : MonoBehaviour
{
    [SerializeField] private float jumpSpeed = 6f;
    private Rigidbody body;
    private bool jumpPressed;

    private void Awake()
    {
        body = GetComponent<Rigidbody>();
    }

    private void Update()
    {
        jumpPressed = Keyboard.current != null && Keyboard.current.spaceKey.wasPressedThisFrame;
    }

    private void FixedUpdate()
    {
        if (!jumpPressed) return;
        body.linearVelocity = new Vector3(body.linearVelocity.x, jumpSpeed, body.linearVelocity.z);
        jumpPressed = false;
    }
}
```

## Data and safety
- Expose designer fields with `[SerializeField] private`. Do not make gameplay fields public just so the Inspector can see them.
- Put tuneable numbers (damage, speeds, drop tables) on a ScriptableObject asset, not in a hardcoded constant inside a behaviour.
- Compare tags with `CompareTag("Player")`, not `tag == "Player"`.
- Null-check `Keyboard.current` and action references. They are null when the device is missing or the domain reloads.

## Async and timing
- For waits, prefer `Awaitable` (`await Awaitable.WaitForSecondsAsync(1f)`) or a coroutine. Do not use `Thread.Sleep` or `Task.Delay` on the main thread.
- Unity objects are not thread-safe. Touch `Transform`, `GameObject`, and components only on the main thread.
- Check `this != null` after an `await`. The object may have been destroyed while the method was suspended.

## Scenes and prefabs
- Do not write YAML into `.unity`, `.prefab`, or `.asset` files by hand. Change them in the editor or through an editor script.
- Load scenes by name or build index with `SceneManager.LoadSceneAsync`. Add the scene to the build profile first.
- Instantiate prefabs from a serialized reference, not `Resources.Load`, unless the project already uses Resources.

## Done checklist
1. The Console shows no compile errors after the editor recompiles.
2. No obsolete-API warnings were introduced (`FindObjectOfType`, `velocity`, `Input.*`).
3. You said whether Play Mode was actually tested.

---

Source: Loadout free Unity 6 pack (https://loadout-blush.vercel.app/packs/unity-6). Pinned to Unity 6.3 LTS (6000.3.x), last verified 2026-10-15. MIT License.

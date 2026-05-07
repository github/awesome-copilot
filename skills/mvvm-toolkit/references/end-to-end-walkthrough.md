# End-to-end walkthrough: WinUI 3 Notes app

A minimal Notes app demonstrating the full MVVM Toolkit story:
`ObservableObject`/`ObservableRecipient`, `[ObservableProperty]`,
`[RelayCommand]`, `[NotifyCanExecuteChangedFor]`, `WeakReferenceMessenger`,
and `Microsoft.Extensions.DependencyInjection`.

This walkthrough mirrors the official tutorial at
<https://learn.microsoft.com/en-us/windows/apps/tutorials/winui-mvvm-toolkit/intro>.

> The same pattern works on WPF, MAUI, Uno, and Avalonia — only the
> XAML, navigation, and `App` bootstrap differ.

---

## Project layout

```
MyApp/                  ← WinUI 3 app project
  App.xaml.cs
  Views/
    AllNotesPage.xaml
    NotePage.xaml
MyApp.Shared/           ← .NET class library — ViewModels + services
  ViewModels/
    AllNotesViewModel.cs
    NoteViewModel.cs
  Services/
    INotesService.cs
    FileSystemNotesService.cs
  Messages/
    NoteSavedMessage.cs
    NoteDeletedMessage.cs
MyApp.Tests/            ← xUnit / MSTest project — VM unit tests
```

Putting ViewModels in a separate library is the recommended pattern: the
library has no UI dependencies, so VMs are unit-testable in isolation.

---

## 1. The model

Plain POCO — no toolkit dependencies.

```csharp
public sealed record NoteSummary(string Filename, string Preview, DateTime LastModified);
```

---

## 2. The service

```csharp
public interface INotesService
{
    Task<IReadOnlyList<NoteSummary>> GetAllAsync();
    Task<string> LoadAsync(string filename);
    Task SaveAsync(string filename, string text);
    Task DeleteAsync(string filename);
}

public sealed class FileSystemNotesService(string rootFolder) : INotesService
{
    public async Task<IReadOnlyList<NoteSummary>> GetAllAsync()
    {
        var files = Directory.GetFiles(rootFolder, "*.txt");
        var summaries = new List<NoteSummary>(files.Length);
        foreach (var f in files)
        {
            var text = await File.ReadAllTextAsync(f);
            summaries.Add(new NoteSummary(
                Path.GetFileName(f),
                text.Length > 60 ? text[..60] : text,
                File.GetLastWriteTime(f)));
        }
        return summaries;
    }

    public Task<string> LoadAsync(string filename) =>
        File.ReadAllTextAsync(Path.Combine(rootFolder, filename));

    public Task SaveAsync(string filename, string text) =>
        File.WriteAllTextAsync(Path.Combine(rootFolder, filename), text);

    public Task DeleteAsync(string filename)
    {
        File.Delete(Path.Combine(rootFolder, filename));
        return Task.CompletedTask;
    }
}
```

---

## 3. The messages

```csharp
public sealed record NoteSavedMessage(string Filename);
public sealed record NoteDeletedMessage(string Filename);
```

---

## 4. The list view model

```csharp
using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;

public sealed partial class AllNotesViewModel : ObservableRecipient,
    IRecipient<NoteSavedMessage>,
    IRecipient<NoteDeletedMessage>
{
    private readonly INotesService notes;

    public AllNotesViewModel(INotesService notes, IMessenger messenger)
        : base(messenger)
    {
        this.notes = notes;
        IsActive = true;   // start listening for messages
    }

    public ObservableCollection<NoteSummary> Notes { get; } = new();

    [RelayCommand]
    private async Task LoadAsync()
    {
        Notes.Clear();
        foreach (var n in await notes.GetAllAsync())
            Notes.Add(n);
    }

    public void Receive(NoteSavedMessage message) => _ = LoadAsync();
    public void Receive(NoteDeletedMessage message) => _ = LoadAsync();
}
```

`ObservableRecipient`'s `OnActivated` (called when `IsActive` becomes
`true`) wires up the `IRecipient<T>` handlers automatically.

---

## 5. The editor view model

```csharp
public sealed partial class NoteViewModel : ObservableRecipient
{
    private readonly INotesService notes;

    public NoteViewModel(INotesService notes, IMessenger messenger)
        : base(messenger)
    {
        this.notes = notes;
    }

    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(SaveCommand))]
    [NotifyCanExecuteChangedFor(nameof(DeleteCommand))]
    private string? filename;

    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(SaveCommand))]
    private string? text;

    [RelayCommand]
    private async Task LoadAsync(string filename)
    {
        Filename = filename;
        Text = await notes.LoadAsync(filename);
    }

    [RelayCommand(CanExecute = nameof(CanSave))]
    private async Task SaveAsync()
    {
        await notes.SaveAsync(Filename!, Text!);
        Messenger.Send(new NoteSavedMessage(Filename!));
    }

    [RelayCommand(CanExecute = nameof(CanDelete))]
    private async Task DeleteAsync()
    {
        await notes.DeleteAsync(Filename!);
        Messenger.Send(new NoteDeletedMessage(Filename!));
        Filename = null;
        Text = null;
    }

    private bool CanSave() =>
        !string.IsNullOrWhiteSpace(Filename) && !string.IsNullOrEmpty(Text);

    private bool CanDelete() => !string.IsNullOrWhiteSpace(Filename);
}
```

---

## 6. The composition root (`App.xaml.cs`)

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using CommunityToolkit.Mvvm.Messaging;

public partial class App : Application
{
    public IHost Host { get; }

    public App()
    {
        InitializeComponent();

        var notesRoot = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "MyApp", "notes");
        Directory.CreateDirectory(notesRoot);

        Host = Microsoft.Extensions.Hosting.Host
            .CreateDefaultBuilder()
            .ConfigureServices((_, services) =>
            {
                services.AddSingleton<INotesService>(_ => new FileSystemNotesService(notesRoot));
                services.AddSingleton<IMessenger>(WeakReferenceMessenger.Default);

                services.AddSingleton<AllNotesViewModel>();
                services.AddTransient<NoteViewModel>();
            })
            .Build();
    }

    public static T GetService<T>() where T : class =>
        ((App)Current).Host.Services.GetRequiredService<T>();
}
```

---

## 7. Wire up the views

`AllNotesPage.xaml.cs`:

```csharp
public sealed partial class AllNotesPage : Page
{
    public AllNotesViewModel ViewModel { get; } = App.GetService<AllNotesViewModel>();

    public AllNotesPage()
    {
        InitializeComponent();
    }

    protected override async void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        await ViewModel.LoadCommand.ExecuteAsync(null);
    }
}
```

`AllNotesPage.xaml`:

```xml
<Page x:Class="MyApp.Views.AllNotesPage"
      xmlns:vm="using:MyApp.Shared.ViewModels">
    <Grid RowDefinitions="Auto,*">
        <CommandBar>
            <AppBarButton Icon="Add" Label="New" Click="OnNewClicked"/>
            <AppBarButton Icon="Refresh" Label="Refresh"
                          Command="{x:Bind ViewModel.LoadCommand}"/>
        </CommandBar>
        <ListView Grid.Row="1"
                  ItemsSource="{x:Bind ViewModel.Notes}"
                  ItemClick="OnNoteClicked"
                  IsItemClickEnabled="True">
            <ListView.ItemTemplate>
                <DataTemplate x:DataType="vm:NoteSummary">
                    <StackPanel>
                        <TextBlock Text="{x:Bind Filename}" FontWeight="SemiBold"/>
                        <TextBlock Text="{x:Bind Preview}"
                                   TextTrimming="CharacterEllipsis"/>
                    </StackPanel>
                </DataTemplate>
            </ListView.ItemTemplate>
        </ListView>
    </Grid>
</Page>
```

`NotePage.xaml.cs`:

```csharp
public sealed partial class NotePage : Page
{
    public NoteViewModel ViewModel { get; } = App.GetService<NoteViewModel>();

    public NotePage()
    {
        InitializeComponent();
    }

    protected override async void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is string filename)
            await ViewModel.LoadCommand.ExecuteAsync(filename);
        ViewModel.IsActive = true;
    }

    protected override void OnNavigatedFrom(NavigationEventArgs e)
    {
        ViewModel.IsActive = false;
        base.OnNavigatedFrom(e);
    }
}
```

`NotePage.xaml`:

```xml
<Page x:Class="MyApp.Views.NotePage">
    <Grid RowDefinitions="Auto,*,Auto">
        <TextBox Header="Filename" Text="{x:Bind ViewModel.Filename, Mode=TwoWay}"/>
        <TextBox Grid.Row="1"
                 AcceptsReturn="True" TextWrapping="Wrap"
                 Text="{x:Bind ViewModel.Text, Mode=TwoWay}"/>
        <StackPanel Grid.Row="2" Orientation="Horizontal" Spacing="8">
            <Button Content="Save"  Command="{x:Bind ViewModel.SaveCommand}"/>
            <Button Content="Delete" Command="{x:Bind ViewModel.DeleteCommand}"/>
        </StackPanel>
    </Grid>
</Page>
```

---

## 8. A representative unit test

```csharp
using CommunityToolkit.Mvvm.Messaging;

public sealed class NoteViewModelTests
{
    private sealed class FakeNotesService : INotesService
    {
        public List<(string filename, string text)> Saved { get; } = new();
        public Task<IReadOnlyList<NoteSummary>> GetAllAsync() => Task.FromResult<IReadOnlyList<NoteSummary>>(Array.Empty<NoteSummary>());
        public Task<string> LoadAsync(string filename) => Task.FromResult(string.Empty);
        public Task SaveAsync(string filename, string text)
        {
            Saved.Add((filename, text));
            return Task.CompletedTask;
        }
        public Task DeleteAsync(string filename) => Task.CompletedTask;
    }

    [Fact]
    public async Task SaveCommand_persists_and_broadcasts()
    {
        var notes = new FakeNotesService();
        var messenger = new WeakReferenceMessenger();
        string? receivedFilename = null;
        messenger.Register<NoteSavedMessage>(new object(), (_, m) => receivedFilename = m.Filename);

        var vm = new NoteViewModel(notes, messenger)
        {
            Filename = "hello.txt",
            Text = "world"
        };

        await vm.SaveCommand.ExecuteAsync(null);

        Assert.Single(notes.Saved);
        Assert.Equal("hello.txt", notes.Saved[0].filename);
        Assert.Equal("world", notes.Saved[0].text);
        Assert.Equal("hello.txt", receivedFilename);
    }
}
```

---

## What to internalize from this sample

1. **VMs go in a UI-free class library.** The toolkit's only dependency
   is `netstandard2.0+`, so VMs are testable without a UI host.
2. **Constructor injection everywhere.** The composition root knows how
   to build everything; ViewModels and services receive their
   dependencies via parameters.
3. **`IMessenger` is the cross-VM glue.** `WeakReferenceMessenger.Default`
   is the right default. The list VM listens via `IRecipient<T>`; the
   editor VM publishes via `Messenger.Send`.
4. **`[NotifyCanExecuteChangedFor]` keeps Save/Delete buttons in sync**
   with text input — no manual wiring needed.
5. **`ObservableRecipient.IsActive`** controls subscription lifetime —
   set it from `OnNavigatedTo` / `OnNavigatedFrom` (or an equivalent
   activation hook in your framework).

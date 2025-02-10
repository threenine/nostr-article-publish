import {App, Modal, Notice, requestUrl, Setting, TextAreaComponent, TextComponent, TFile} from "obsidian";
import NostrArticlePublishPlugin from "../../../main";
import NostrService from "../../services/NostrService";


export default class PublishModal extends Modal {
	plugin: NostrArticlePublishPlugin;
	private readonly UPLOAD_ENDPOINT = "https://media.geekiam.systems/";


	constructor(app: App, private nostrService: NostrService, private file: TFile, plugin: NostrArticlePublishPlugin) {
		super(app);

		this.plugin = plugin;

	}

	async onOpen() {
		const {contentEl} = this;
		contentEl.empty();

		if (this.file.extension !== "md") {
			new Notice(`❌ ${this.file.extension} cannot be published. Only MarkDown (.md) files are supported.`)
			this.close()
			return;
		}
		let articleTags: string[] = [];
		let extractor = new ArticleExtractor(this.app)

		let doc = await extractor.extract(this.file);

		for (let tag of doc.tags) {
			articleTags.push(tag);
		}

		contentEl.createEl("h2", {text: `Publish to Nostr`})
			.addClass("publish-modal-title");

		contentEl.createEl("p", {text: `Title`, cls: 'input-label'});
		let titleText = new TextComponent(contentEl)
			.setPlaceholder(`${doc.title}`)
			.setValue(`${doc.title}`);

		titleText.inputEl.setCssStyles({
			width: "100%",
			marginBottom: "5px",
		});


		contentEl.createEl("p", {text: `Summary`, cls: 'input-label'});
		let summaryText = new TextAreaComponent(contentEl)
			.setPlaceholder("A brief summary of the article")
			.setValue(doc.summary);

		summaryText.inputEl.setCssStyles({
			width: "100%",
			height: "100px",
			marginBottom: "10px",
		});
		summaryText.inputEl.classList.add("publish-modal-input");

		let featureImage: any | null = null;
		let featureImagePath: string = "";

		new Setting(contentEl)
			.setName("Feature Image")
			.setDesc("for consistency across clients, use a 1024x470 image.")
			.setClass("input-label")

			.addButton((button) => {
					return button
						.setButtonText("Upload")
						.setIcon("upload")
						.setTooltip("Upload an image file for your article banner.")
						.onClick(async () => {
							const input = document.createElement('input');
							input.type = 'file';
							input.multiple = false;
							input.accept = 'image/*';
							input.click();
							input.addEventListener('change', async () => {

								if (input.files && input.files[0]) {
									imagePreview.src = URL.createObjectURL(input.files[0]);
									imagePreview.style.display = "block";
									const formData = new FormData();
									formData.append('File', input.files[0]);
									try {
										let response = await requestUrl({
											url: this.UPLOAD_ENDPOINT,
											method: "POST",
											headers: {
												"Content-Type": getContentType(input.files[0].name),
											},
											body: await input.files[0].arrayBuffer()
										})
										featureImagePath = response.headers.location;
										featureImage = input.files[0];

									} catch (e) {
										console.log(e)
									}
								}
							});
						});
				}
			);

		let imagePreview = contentEl.createEl("img");
		imagePreview.setCssStyles({
			maxWidth: "100%",
			display: "none",
		});

		const imageNameDiv = contentEl.createEl("div");
		imageNameDiv.setCssStyles({
			display: "none",
		});

		const clearImageButton = contentEl.createEl("div");
		clearImageButton.setCssStyles({
			display: "none",
			background: "none",
			border: "none",
			cursor: "pointer",
			fontSize: "14px",
			color: "red",
			marginTop: "10px",
		});

		clearImageButton.textContent = "❌ Remove";

		function clearSelectedImage() {
			featureImage = null;
			imagePreview.src = "";
			imagePreview.style.display = "none";
			imageNameDiv.textContent = "";
			imageNameDiv.style.display = "none";
			clearImageButton.style.display = "none";
		}

		clearImageButton.addEventListener("click", clearSelectedImage);
		contentEl.createEl("hr");
		contentEl.createEl("h6", {text: `Tags`});

		let badges = new TextComponent(contentEl).setPlaceholder(
			`Add a tag here and press enter`
		);

		badges.inputEl.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				createBadge(badges.getValue());
			}
		});

		badges.inputEl.setCssStyles({
			width: "100%",
			marginBottom: "10px",
		});

		const badgesContainer = contentEl.createEl("div");
		badgesContainer.addClass("badge-container");
		articleTags.forEach((tag) => {
			const pillElement = createBadgeElement(tag);
			badgesContainer.appendChild(pillElement);
		});


		new Setting(this.contentEl)
			.addButton(btn => {
				btn.setButtonText("Cancel")
					.onClick(() => {
						this.close();
					});
			})
			.addButton((btn) =>
				btn
					.setButtonText('Publish')
					.setCta()
					.onClick(async () => {
						btn.setButtonText("Publishing...")
							.setDisabled(true);

						if (featureImage === null || featureImage.name === "") {
							new Notice("❌  A Feature Image is required.")
							btn.setButtonText("Publish")
								.setDisabled(false);
							return;
						}


						let result = await publish(this.nostrService, doc.content, this.file, summaryText.getValue(), featureImagePath, titleText.getValue(), articleTags);

						if (result) {
							new Notice(`✅ Publish Successful`);
							this.close();
						} else {
							new Notice(`❌ Publish Failed`);
							btn.setButtonText("Publish")
								.setDisabled(false);
						}
					})).setClass("publish-control-container");

		async function publish(service: NostrService, content: string, file: TFile, summary: string, image: string, title: string, tags: string[]): Promise<Boolean> {


			try {


				let res = await service.publish(
					content,
					summary,
					image,
					title,
					tags
				);

				console.log(res);
				return !!res;

			} catch (error) {
				console.error(error);
				return false;
			}
		}

		function createBadgeElement(tag: string) {
			const pillElement = document.createElement("div");
			pillElement.className = "badge";
			pillElement.textContent = tag;

			const deleteButton = document.createElement("div");
			deleteButton.className = "remove";
			deleteButton.textContent = "x";

			deleteButton.addEventListener("click", () => {
				articleTags = articleTags.filter((t) => t !== tag);
				pillElement.remove();
			});

			pillElement.appendChild(deleteButton);
			return pillElement;
		}

		function createBadge(name: string) {
			if (name.trim() === "") return;
			articleTags.push(name.trim());
			let badge = createBadgeElement(name.trim());
			badgesContainer.appendChild(badge);
			badges.setValue("");
		}
		function getContentType(filename: string): string {
			let extension = filename.split('.').pop()?.toLowerCase();
			switch (extension) {
				case 'jpg':
				case 'jpeg':
					return 'image/jpeg';
				case 'png':
					return 'image/png';
				case 'gif':
					return 'image/gif';
				// Add more types as needed
				default:
					return 'application/octet-stream'; // Default to a generic binary type if not recognized
			}
		}
	}


	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

export class Article {
	title: string;
	summary: string;
	tags: string[];
	content: string;
}

export interface Extractor {
	extract(file: TFile): Promise<Article>;
}

export class ArticleExtractor implements Extractor {

	private app: App;
	protected frontMatterRegex: RegExp = /---\s*[\s\S]*?\s*---/g;


	constructor(app: App) {
		this.app = app;

	}

	async extract(file: TFile): Promise<Article> {

		if (!file) {
			throw new Error("No file provided");
		}

		let response = new Article()
		let fileInfo = this.app.metadataCache.getFileCache(file)?.frontmatter;

		if (fileInfo !== undefined) {
			response.title = fileInfo.title || file.basename;
			response.summary = fileInfo.summary || "";
			response.tags = fileInfo.tags;
		}
		response.content = (await this.app.vault.read(file)).replace(this.frontMatterRegex, "").trim();

		return response;
	}


}

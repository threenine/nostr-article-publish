import {App, Modal, Notice, requestUrl, Setting, TextAreaComponent, TextComponent, TFile} from "obsidian";
import NostrArticlePublishPlugin from "../../../main";
import NostrService from "../../services/NostrService";
import * as path from "node:path";


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
		const extractor = new ArticleExtractor(this.app)

		const doc = await extractor.extract(this.file);

		for (const tag of doc.tags) {
			articleTags.push(tag);
		}

		new Setting(contentEl)

			.setDesc("To publish your article to nostr, ensure the following metadata is completed")
			.setClass("publish-modal-title")
			.setHeading().setName("Publish").setClass("publish-modal-title")
		;



		contentEl.createEl("p", {text: `Title`, cls: 'input-label'});
		const titleText = new TextComponent(contentEl)
			.setPlaceholder(`${doc.title}`)
			.setValue(`${doc.title}`);

		titleText.inputEl.setCssStyles({
			width: "100%",
			marginBottom: "5px",
		});

		contentEl.createEl("p", {text: `Summary`, cls: 'input-label'});
		const summaryText = new TextAreaComponent(contentEl)
			.setPlaceholder("A brief summary of the article")
			.setValue(doc.summary);

		summaryText.inputEl.setCssStyles({
			width: "100%",
			height: "100px",
			marginBottom: "10px",
		});
		summaryText.inputEl.classList.add("publish-modal-input");

		let featureImage: File | null = null;
		let featureImagePath  = "";

		new Setting(contentEl)
			.setName("Feature Image")
			.setDesc("For consistency across clients, use a 1024x470 image.")
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
									try {
										const response = await requestUrl({
											url: this.UPLOAD_ENDPOINT,
											method: "POST",
											headers: {
												"Content-Type": getContentType(input.files[0].name),
											},
											body: await input.files[0].arrayBuffer()
										})
										featureImagePath = response.headers.location;
										featureImage = input.files[0];
										imageNameDiv.textContent = input.files[0].name;

									} catch (e) {
										console.log("Adding Feature Image failed",e);
									}
								}
							});
						});
				}
			);

		const imagePreview = contentEl.createEl("img");
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

		const badges = new TextComponent(contentEl).setPlaceholder(
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
							new Notice("❌  A Feature Image is required. Please upload an image file for your article feature banner.")
							btn.setButtonText("Publish")
								.setDisabled(false);
							return;
						}
						const imagePaths: string[] = [];
						const vaultResolvedLinks = this.app.metadataCache.resolvedLinks;
						if (vaultResolvedLinks[this.file.path]) {
							const fileContents = vaultResolvedLinks[this.file.path];
							for (const filePath of Object.keys(fileContents)) {
								if (isImagePath(filePath)) {
									imagePaths.push(filePath);
								}
							}
						}

						if (imagePaths.length > 0) {
							for (const imagePath of imagePaths) {
								const imageFile = this.app.vault.getAbstractFileByPath(imagePath);

								if (imageFile instanceof TFile) {
									const imageBinary = await this.app.vault.readBinary(imageFile);
									try {
										const response = await requestUrl({
											url: this.UPLOAD_ENDPOINT,
											method: "POST",
											headers: {
												"Content-Type": getContentType(imageFile.name),
											},
											body: imageBinary
										})
										doc.content = doc.content.replace(`![[${imagePath}]]`, `![](${response.headers.location}) `);

									} catch (e) {
										throw new Error(`Failed to upload image ${imagePath}`);
									}
								}
							}
						}

						const result = await publish(this.nostrService, doc.content, this.file, summaryText.getValue(), featureImagePath, titleText.getValue(), articleTags);

						if (result) {
							new Notice(`✅ Successfully published ${this.file.basename}`);
							this.close();
						} else {
							new Notice(`❌ Publish Failed`);
							btn.setButtonText("Publish")
								.setDisabled(false);
						}
					})).setClass("publish-control-container");

		async function publish(service: NostrService, content: string, file: TFile, summary: string, image: string, title: string, tags: string[]): Promise<boolean> {
			try {
				return await service.publish(
					content,
					summary,
					image,
					title,
					tags
				);

			} catch (error) {
				throw new Error(`Failed to publish ${file.basename}`);
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
			const badge = createBadgeElement(name.trim());
			badgesContainer.appendChild(badge);
			badges.setValue("");
		}

		function getContentType(filename: string): string {
			const extension = filename.split('.').pop()?.toLowerCase();
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
		function isImagePath(filePath: string): boolean {
			const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'];
			const ext = path.extname(filePath).toLowerCase();
			return imageExtensions.includes(ext);
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
	protected frontMatterRegex = /---\s*[\s\S]*?\s*---/g;

	constructor(app: App) {
		this.app = app;
	}

	async extract(file: TFile): Promise<Article> {

		if (!file) {
			throw new Error("No file provided");
		}

		const response = new Article()
		const fileInfo = this.app.metadataCache.getFileCache(file)?.frontmatter;

		if (fileInfo !== undefined) {
			response.title = fileInfo.title || file.basename;
			response.summary = fileInfo.summary || "";
			response.tags = fileInfo.tags;
		}
		response.content = (await this.app.vault.read(file)).replace(this.frontMatterRegex, "").trim();

		return response;
	}
}

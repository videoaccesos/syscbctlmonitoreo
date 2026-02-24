<?php session_start(); ?>
<!DOCTYPE html>
<html lang="es">
	<head>
		<meta charset="UTF-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Document</title>
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-eOJMYsd53ii+scO/bJGFsiCZc+5NDVN2yr8+0RDqr0Ql0h+rP48ckxlpbzKgwra6" crossorigin="anonymous">
	</head>
<body>
	<div class="container">
        <div  class="col-md-12">
            <?php
                if(isset($_SESSION['status']) && $_SESSION['status'] !=""){
                   
            ?>
                <div class="alert alert-warning alert-dismissible fade show" role="alert">
                    <strong>Hey!</strong> <?php echo $_SESSION['status']; ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            <?php
                    unset($_SESSION['status']);
                }
            ?>
        </div>
		<div class="row justify-content-center">
			<div class="col-md-6 mt-4">
				<h3>Insertar tarjetas</h3>
				<hr>
				<form action="insertartarjetas.php" method="post">
                    <div class="form-group">
                        <label for="telefono">Numero de tarjeta: </label>
                        <input type="text" id="tarjeta" name="tarjeta" required placeholder="Tarjeta a dar de alta">
                        <br><br>
                    </div>
                    <div class="form-group">
                        <label for="moroso">¿El cliente es moroso?</label>
                        <select name="moroso" class="form-control">
                            <option value="false">NO</option>
                            <option value="true">SI</option>
                        </select>
                        <br><br>
                    </div>
                    <div class="form-group">
                        <button type="submit">Guardar Tarjeta</button>
                    </div>      
				</form>
				<script src="https://code.jquery.com/jquery-3.6.0.js"> </script>

				<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.1/dist/umd/popper.min.js" integrity="sha384-SR1sx49pcuLnqZUnnPwx6FCym0wLsk5JZuNx2bPPENzswTNFaQU1RDvt3wT4gWFG" crossorigin="anonymous"></script>
				<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta3/dist/js/bootstrap.min.js" integrity="sha384-j0CNLUeiqtyaRmlzUHCPZ+Gy5fQu0dQ6eZ/xAww941Ai1SxSY+0EQqNXNE6DZiVc" crossorigin="anonymous"></script>
			</div>
		</div>
	</div>
</body>
</html>